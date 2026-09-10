param(
  [string]$Image = "postgres:17-alpine"
)

# Windows PowerShell 5.1 promotes native stderr (including harmless PostgreSQL
# NOTICE output) to NativeCommandError. Every Docker/psql call below checks
# $LASTEXITCODE explicitly, so native stderr must remain non-terminating.
$ErrorActionPreference = "Continue"
$container = "plms-phase12-$PID"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$mount = $root -replace '\\', '/'
$jobs = @()
$containerStarted = $false

if (Test-Path -Path (Join-Path $root "supabase/migrations/032*.sql")) {
  throw "Migration 032 must remain absent from supabase/migrations."
}
if (-not (Test-Path -LiteralPath (Join-Path $root "supabase/migration-drafts/032_phase12_p0_crm_security_containment.sql"))) {
  throw "The quarantined Migration 032 draft is missing."
}

try {
  docker version *> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker engine is unavailable." }

  docker run --rm --detach --name $container `
    --env POSTGRES_PASSWORD=phase12-test `
    --volume "${mount}:/workspace:ro" `
    $Image *> $null
  if ($LASTEXITCODE -ne 0) { throw "Failed to start disposable PostgreSQL." }
  $containerStarted = $true

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $container pg_isready --username postgres --dbname postgres *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "Disposable PostgreSQL did not become ready." }

  docker exec $container psql --username postgres --dbname postgres `
    --file /workspace/supabase/tests/phase12_bootstrap.sql
  if ($LASTEXITCODE -ne 0) { throw "Phase 12 bootstrap failed." }

  docker exec $container psql --username postgres --dbname postgres `
    --file /workspace/supabase/migrations/031_phase11_sales_revenue_operations.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Migration 031 sequence step failed." }

  docker exec $container psql --username postgres --dbname postgres `
    --file /workspace/supabase/migrations/033_phase12_rpc_acl_containment.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Migration 033 sequence step failed." }

  docker exec $container psql --username postgres --dbname postgres --command `
    "ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY; CREATE POLICY invoices_legacy_allow_all ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);" *> $null
  if ($LASTEXITCODE -ne 0) { throw "Failed to seed the permissive invoice-policy containment fixture." }

  docker exec $container psql --username postgres --dbname postgres `
    --file /workspace/supabase/migrations/034_phase12_crm_security_hardening.sql
  if ($LASTEXITCODE -ne 0) { throw "Migration 034 failed." }
  "phase12_migration_sequence_031_033_034: PASS (032 absent)"

  docker exec $container psql --username postgres --dbname postgres `
    --file /workspace/supabase/tests/phase12_security_test.sql
  if ($LASTEXITCODE -ne 0) { throw "Phase 12 integration assertions failed." }

  docker exec $container psql --username postgres --dbname postgres `
    --command "CREATE DATABASE phase12_preflight;" *> $null
  if ($LASTEXITCODE -ne 0) { throw "Failed to create the reconciliation-preflight database." }

  docker exec $container psql --username postgres --dbname phase12_preflight `
    --file /workspace/supabase/tests/phase12_bootstrap.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Preflight bootstrap failed." }

  docker exec $container psql --username postgres --dbname phase12_preflight `
    --file /workspace/supabase/migrations/031_phase11_sales_revenue_operations.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Preflight Migration 031 step failed." }

  docker exec $container psql --username postgres --dbname phase12_preflight `
    --file /workspace/supabase/migrations/033_phase12_rpc_acl_containment.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Preflight Migration 033 step failed." }

  docker exec $container psql --username postgres --dbname phase12_preflight `
    --file /workspace/supabase/tests/phase12_preflight_fixture.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Preflight fixture failed." }

  # cmd.exe combines the expected psql stderr into stdout without PowerShell
  # promoting it to a terminating NativeCommandError.
  $preflightOutput = & cmd.exe /d /c "docker exec $container psql --username postgres --dbname phase12_preflight --set ON_ERROR_STOP=1 --file /workspace/supabase/migrations/034_phase12_crm_security_hardening.sql 2>&1"
  $preflightExitCode = $LASTEXITCODE
  if ($preflightExitCode -eq 0) {
    throw "Migration 034 accepted an incomplete verified Deal."
  }
  if (($preflightOutput -join "`n") -notmatch "Verified deals with incomplete financial records require reconciliation") {
    throw "Migration 034 failed for an unexpected preflight reason."
  }

  $preflightState = docker exec $container psql --username postgres --dbname phase12_preflight --tuples-only --no-align --command `
    "SELECT concat((SELECT count(*)=0 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_contacts' AND column_name='created_by'),'|',(SELECT role='superadmin' FROM public.users WHERE id='00000000-0000-0000-0000-000000000006'),'|',(to_regprocedure('public.crm_actor_role()') IS NULL),'|',(NOT has_function_privilege('authenticated','public.process_deal_closing_atomic(uuid,uuid,numeric)','execute') AND NOT has_function_privilege('anon','public.process_deal_closing_atomic(uuid,uuid,numeric)','execute') AND has_function_privilege('service_role','public.process_deal_closing_atomic(uuid,uuid,numeric)','execute')));"
  if ($LASTEXITCODE -ne 0 -or $preflightState.Trim() -ne "t|t|t|t") {
    throw "Reconciliation-preflight rollback assertion failed. State: $($preflightState.Trim())"
  }
  "phase12_reconciliation_preflight: PASS (transaction rolled back schema, data, functions, and ACL)"

  docker exec $container psql --username postgres --dbname postgres `
    --command "CREATE DATABASE phase12_lock;" *> $null
  if ($LASTEXITCODE -ne 0) { throw "Failed to create the lock-contention database." }

  docker exec $container psql --username postgres --dbname phase12_lock `
    --file /workspace/supabase/tests/phase12_bootstrap.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Lock-test bootstrap failed." }

  docker exec $container psql --username postgres --dbname phase12_lock `
    --file /workspace/supabase/migrations/031_phase11_sales_revenue_operations.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Lock-test Migration 031 step failed." }

  docker exec $container psql --username postgres --dbname phase12_lock `
    --file /workspace/supabase/migrations/033_phase12_rpc_acl_containment.sql *> $null
  if ($LASTEXITCODE -ne 0) { throw "Lock-test Migration 033 step failed." }

  docker exec $container psql --username postgres --dbname phase12_lock --command `
    "CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations (version text PRIMARY KEY, name text); INSERT INTO supabase_migrations.schema_migrations VALUES ('031','phase11_sales_revenue_operations'),('033','phase12_rpc_acl_containment');" *> $null
  if ($LASTEXITCODE -ne 0) { throw "Failed to seed lock-test migration history." }

  $lockJob = Start-Job -ScriptBlock {
    param($containerName)
    docker exec $containerName psql --username postgres --dbname phase12_lock --set ON_ERROR_STOP=1 `
      --command "SET application_name = 'phase12-lock-holder'; BEGIN; LOCK TABLE public.users IN ROW EXCLUSIVE MODE; SELECT pg_sleep(30); COMMIT;" *> $null
  } -ArgumentList $container
  $jobs = @($lockJob)

  $lockHeld = $false
  for ($attempt = 0; $attempt -lt 100; $attempt++) {
    $lockCount = docker exec $container psql --username postgres --dbname phase12_lock --tuples-only --no-align `
      --command "SELECT count(*) FROM pg_locks AS l JOIN pg_class AS c ON c.oid=l.relation WHERE c.oid='public.users'::regclass AND l.mode='RowExclusiveLock' AND l.granted AND l.pid<>pg_backend_pid();"
    if ($LASTEXITCODE -ne 0) { throw "Failed to inspect the held lock." }
    if ($lockCount.Trim() -eq "1") {
      $lockHeld = $true
      break
    }
    Start-Sleep -Milliseconds 100
  }
  if (-not $lockHeld) { throw "Conflicting lock was not acquired in time." }

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  $lockOutput = & cmd.exe /d /c "docker exec $container psql --username postgres --dbname phase12_lock --set ON_ERROR_STOP=1 --file /workspace/supabase/migrations/034_phase12_crm_security_hardening.sql 2>&1"
  $lockExitCode = $LASTEXITCODE
  $stopwatch.Stop()

  docker exec $container psql --username postgres --dbname phase12_lock --command `
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='phase12-lock-holder' AND pid<>pg_backend_pid();" *> $null
  Wait-Job -Job $lockJob -Timeout 5 | Out-Null
  Receive-Job -Job $lockJob -ErrorAction SilentlyContinue | Out-Null
  Remove-Job -Job $lockJob -Force
  $jobs = @()

  if ($lockExitCode -eq 0) { throw "Migration 034 unexpectedly acquired a conflicting lock." }
  if (($lockOutput -join "`n") -notmatch "canceling statement due to lock timeout") {
    throw "Migration 034 lock test failed for an unexpected reason: $($lockOutput -join ' ')"
  }
  if ($stopwatch.Elapsed.TotalSeconds -lt 8 -or $stopwatch.Elapsed.TotalSeconds -gt 20) {
    throw "Migration 034 did not fail within the expected 10-second lock timeout window: $($stopwatch.Elapsed.TotalSeconds)s."
  }

  $lockState = docker exec $container psql --username postgres --dbname phase12_lock --tuples-only --no-align --command `
    "SELECT concat((SELECT count(*)=0 FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_contacts' AND column_name='created_by'),'|',(SELECT role='superadmin' FROM public.users WHERE id='00000000-0000-0000-0000-000000000006'),'|',(SELECT coalesce(bool_and(qual LIKE '%true%'),false) FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='crm_leads_select'));"
  if ($LASTEXITCODE -ne 0 -or $lockState.Trim() -ne "t|t|t") {
    throw "Lock-timeout state assertion failed. State: $($lockState.Trim())"
  }
  "phase12_lock_timeout: PASS ($([math]::Round($stopwatch.Elapsed.TotalSeconds, 2))s; lock acquisition failed before migration changes)"

  $lead = "30000000-0000-0000-0000-000000000007"
  $agents = @(
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002"
  )
  docker exec $container psql --username postgres --dbname postgres `
    --command "CREATE TABLE test.claim_barrier (agent_id uuid PRIMARY KEY);" *> $null
  if ($LASTEXITCODE -ne 0) { throw "Failed to create the claim synchronization barrier." }

  $jobs = foreach ($agent in $agents) {
    Start-Job -ScriptBlock {
      param($containerName, $leadId, $agentId)

      docker exec $containerName psql --username postgres --dbname postgres `
        --command "INSERT INTO test.claim_barrier (agent_id) VALUES ('$agentId');" *> $null
      if ($LASTEXITCODE -ne 0) { throw "Failed to join the claim synchronization barrier." }

      $released = $false
      for ($attempt = 0; $attempt -lt 200; $attempt++) {
        $readyCount = docker exec $containerName psql --username postgres --dbname postgres `
          --tuples-only --no-align --command "SELECT count(*) FROM test.claim_barrier;"
        if ($LASTEXITCODE -ne 0) { throw "Failed to inspect the claim synchronization barrier." }
        if ($readyCount.Trim() -eq "2") {
          $released = $true
          break
        }
        Start-Sleep -Milliseconds 50
      }
      if (-not $released) { throw "Concurrent claim barrier timed out." }

      $sql = @"
BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '$agentId', true);
SELECT CASE WHEN public.claim_crm_lead_atomic('$leadId') THEN 1 ELSE 0 END;
SELECT pg_sleep(1);
COMMIT;
"@
      docker exec $containerName psql --username postgres --dbname postgres --tuples-only --no-align --command $sql
      if ($LASTEXITCODE -ne 0) { throw "Concurrent claim command failed." }
    } -ArgumentList $container, $lead, $agent
  }

  Wait-Job -Job $jobs -Timeout 30 | Out-Null
  $unfinishedJobs = @($jobs | Where-Object State -in @("NotStarted", "Running", "Blocked"))
  if ($unfinishedJobs.Count -gt 0) {
    $unfinishedJobs | Stop-Job
    throw "Concurrent claim workers timed out."
  }
  $claimOutput = @($jobs | Receive-Job)
  $failedJobs = @($jobs | Where-Object State -ne "Completed")
  Remove-Job -Job $jobs -Force
  $jobs = @()
  if ($failedJobs.Count -gt 0) { throw "A concurrent claim worker failed." }

  $claimCounts = @($claimOutput | Where-Object { $_ -match '^[01]$' } | ForEach-Object { [int]$_ } | Sort-Object)
  if ($claimCounts.Count -ne 2 -or $claimCounts[0] -ne 0 -or $claimCounts[1] -ne 1) {
    throw "Concurrent claim assertion failed. Expected one winner and one loser; got: $($claimCounts -join ',')."
  }

  $winner = docker exec $container psql --username postgres --dbname postgres --tuples-only --no-align `
    --command "SELECT assigned_to FROM public.crm_leads WHERE id = '$lead';"
  if ($LASTEXITCODE -ne 0 -or $agents -notcontains $winner.Trim()) {
    throw "Concurrent claim winner was not persisted correctly."
  }

  "phase12_claim_concurrency: PASS (winner $($winner.Trim()))"
}
finally {
  if ($jobs.Count -gt 0) {
    $jobs | Stop-Job -ErrorAction SilentlyContinue
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
  }
  if ($containerStarted) {
    docker stop $container *> $null
  }
}
