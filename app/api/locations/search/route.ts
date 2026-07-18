// app/api/locations/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );

  try {
    // Search di provinces
    const { data: provinces } = await supabase
      .from("provinces")
      .select("id, name, country_id")
      .ilike("name", `%${query}%`)
      .limit(5);

    // Search di cities
    const { data: cities } = await supabase
      .from("cities")
      .select(`
        id, 
        name, 
        province_id,
        provinces(name)
      `)
      .ilike("name", `%${query}%`)
      .limit(5);

    // Search di districts
    const { data: districts } = await supabase
      .from("districts")
      .select(`
        id, 
        name, 
        city_id,
        cities(name, provinces(name))
      `)
      .ilike("name", `%${query}%`)
      .limit(5);

    // Search di villages
    const { data: villages } = await supabase
      .from("villages")
      .select(`
        id, 
        name, 
        district_id,
        districts(name, cities(name, provinces(name)))
      `)
      .ilike("name", `%${query}%`)
      .limit(5);

    const results = [];

    // Format provinces
    for (const p of (provinces || [])) {
      results.push({
        id: p.id,
        name: p.name,
        type: "province",
        fullAddress: p.name,
        parentName: "Indonesia",
        province_id: p.id,
        city_id: null,
        district_id: null,
        village_id: null,
      });
    }

    // Format cities
    for (const c of (cities || [])) {
      const provinceName = (c as any).provinces?.name || "";
      results.push({
        id: c.id,
        name: c.name,
        type: "city",
        fullAddress: `${c.name}, ${provinceName}`,
        parentName: provinceName,
        province_id: c.province_id,
        city_id: c.id,
        district_id: null,
        village_id: null,
      });
    }

    // Format districts
    for (const d of (districts || [])) {
      const cityName = (d as any).cities?.name || "";
      const provinceName = (d as any).cities?.provinces?.name || "";
      results.push({
        id: d.id,
        name: d.name,
        type: "district",
        fullAddress: `${d.name}, ${cityName}, ${provinceName}`,
        parentName: `${cityName}, ${provinceName}`,
        province_id: (d as any).cities?.province_id || null,
        city_id: d.city_id,
        district_id: d.id,
        village_id: null,
      });
    }

    // Format villages
    for (const v of (villages || [])) {
      const districtName = (v as any).districts?.name || "";
      const cityName = (v as any).districts?.cities?.name || "";
      const provinceName = (v as any).districts?.cities?.provinces?.name || "";
      results.push({
        id: v.id,
        name: v.name,
        type: "village",
        fullAddress: `${v.name}, ${districtName}, ${cityName}, ${provinceName}`,
        parentName: `${districtName}, ${cityName}, ${provinceName}`,
        province_id: (v as any).districts?.cities?.province_id || null,
        city_id: (v as any).districts?.city_id || null,
        district_id: v.district_id,
        village_id: v.id,
      });
    }

    // Sort by relevance (type priority: village > district > city > province)
    const typePriority = { village: 0, district: 1, city: 2, province: 3 };
    results.sort((a, b) => {
      const priorityA = typePriority[a.type as keyof typeof typePriority] ?? 4;
      const priorityB = typePriority[b.type as keyof typeof typePriority] ?? 4;
      return priorityA - priorityB;
    });

    // Limit total
    return NextResponse.json({ data: results.slice(0, 10) });
  } catch (error) {
    console.error("Location search error:", error);
    return NextResponse.json({ data: [], error: "Search failed" }, { status: 500 });
  }
}