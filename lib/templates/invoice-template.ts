// lib/templates/invoice-template.ts

export interface InvoiceTemplateData {
  invoice_number: string;
  formatted_date: string;
  client_name: string;
  item_title: string;
  item_address?: string;
  amount: number;
  logo_base64?: string;
  bank_name?: string;
  bank_account?: string;
  bank_an?: string;
  director_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function generateInvoiceHTML(data: InvoiceTemplateData): string {
  // Format Uang Rupiah Akurat & Konsisten
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    })
      .format(val || 0)
      .replace("Rp", "Rp. ") + ",-";
  };

  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Invoice ${data.invoice_number}</title>
    <style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #ffffff; }
        .page-container { position: relative; width: 210mm; height: 297mm; box-sizing: border-box; overflow: hidden; background: #ffffff; }
        
        /* HEADER BANNER */
        .header-banner { width: 100%; height: 135px; position: absolute; top: 0; left: 0; z-index: 1; }
        
        /* CONTENT AREA */
        .content { position: relative; z-index: 2; padding: 135px 45px 120px 45px; }

        /* LOGO KIRI ATAS */
        .logo-container {
          position: absolute;
          top: 20px;
          left: 45px;
          z-index: 3;
        }
        .logo-img {
          max-height: 75px;
          max-width: 260px;
          object-fit: contain;
        }

        .meta-section { width: 100%; margin-bottom: 20px; display: table; }
        .client-details { display: table-cell; width: 55%; vertical-align: top; font-size: 13pt; line-height: 1.5; color: #2b2b2b; }
        .invoice-details { display: table-cell; width: 45%; vertical-align: top; text-align: right; }
        .invoice-title { font-size: 30pt; font-weight: 900; color: #0E2C24; letter-spacing: 1px; margin: 0 0 4px 0; }
        .invoice-meta-item { font-size: 11pt; color: #333333; line-height: 1.4; }
        .divider { width: 100%; height: 2px; background-color: #0E2C24; margin: 12px 0 16px 0; }
        
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .invoice-table th { background-color: #0E2C24; color: #ffffff; font-size: 12pt; font-weight: bold; padding: 10px 16px; text-transform: uppercase; }
        .invoice-table th.left { text-align: left; }
        .invoice-table th.right { text-align: right; }
        .invoice-table td { padding: 10px 16px; font-size: 11pt; vertical-align: top; }
        
        .row-grey { background-color: #ECECEC; }
        .row-white { background-color: #ffffff; }
        .item-title { font-size: 12pt; color: #1a1a1a; font-weight: bold; }
        .item-price { font-size: 12pt; color: #1a1a1a; font-weight: bold; text-align: right; }
        .item-address { font-size: 10.5pt; color: #333333; line-height: 1.45; }
        
        .subtotal-container { width: 100%; margin-top: 15px; display: table; }
        .subtotal-right { display: table-cell; width: 100%; text-align: right; }
        .subtotal-box { display: inline-block; border-top: 2px solid #0E2C24; border-bottom: 2px solid #0E2C24; padding: 7px 16px; background-color: #ECECEC; font-size: 11.5pt; font-weight: bold; color: #0E2C24; }
        .subtotal-label { margin-right: 25px; color: #333333; font-weight: normal; }
        
        .bottom-section { width: 100%; margin-top: 40px; display: table; position: relative; }
        .payment-info { display: table-cell; width: 55%; vertical-align: top; font-size: 11pt; line-height: 1.6; }
        .payment-title { font-weight: bold; color: #0E2C24; text-decoration: underline; margin-bottom: 4px; }
        .payment-bank { font-weight: bold; color: #0E2C24; font-size: 11.5pt; }
        .payment-an { font-weight: bold; color: #0E2C24; }
        
        .signature-section { display: table-cell; width: 45%; vertical-align: top; text-align: right; position: relative; }
        .director-title { font-size: 11pt; color: #333333; margin-bottom: 55px; }
        .director-name { font-size: 11pt; color: #333333; font-weight: 500; }
        .watermark { position: absolute; right: 0px; top: -15px; opacity: 0.12; width: 170px; pointer-events: none; }
        
        .footer-banner { width: 100%; height: 125px; position: absolute; bottom: 0; left: 0; z-index: 1; }
        .footer-content { position: absolute; bottom: 12px; left: 45px; right: 45px; z-index: 2; color: #ffffff; font-size: 9pt; line-height: 1.6; }
        .footer-item { margin-bottom: 2px; }
    </style>
</head>
<body>
    <div class="page-container">
        <svg class="header-banner" viewBox="0 0 800 135" preserveAspectRatio="none">
            <polygon points="0,0 800,0 800,60 0,120" fill="#0E2C24" />
            <polygon points="0,120 800,60 800,75 0,135" fill="#E2B23B" />
        </svg>

        ${
          data.logo_base64
            ? `<div class="logo-container">
                 <img src="${data.logo_base64}" alt="Logo Inland Property" class="logo-img" />
               </div>`
            : ""
        }

        <div class="content">
            <div class="meta-section">
                <div class="client-details">
                    Kepada yth.<br>
                    <strong>${data.client_name || "Klien Properti"}</strong>
                </div>
                <div class="invoice-details">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta-item">No: ${data.invoice_number}</div>
                    <div class="invoice-meta-item">${data.formatted_date}</div>
                </div>
            </div>

            <div class="divider"></div>

            <table class="invoice-table">
                <thead>
                    <tr>
                        <th class="left">KETERANGAN</th>
                        <th class="right">UANG TANDA JADI / NOMINAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="row-grey">
                        <td class="item-title">${data.item_title || "Transaksi Properti"}</td>
                        <td class="item-price">${formatRupiah(data.amount)}</td>
                    </tr>
                    ${
                      data.item_address
                        ? `<tr class="row-white">
                        <td colspan="2" class="item-address">Alamat : ${data.item_address}</td>
                    </tr>`
                        : ""
                    }
                    <tr class="row-grey"><td colspan="2" style="height: 35px;"></td></tr>
                </tbody>
            </table>

            <div class="divider"></div>

            <div class="subtotal-container">
                <div class="subtotal-right">
                    <div class="subtotal-box">
                        <span class="subtotal-label">Sub Total</span>
                        <span>${formatRupiah(data.amount)}</span>
                    </div>
                </div>
            </div>

            <div class="bottom-section">
                <div class="payment-info">
                    <div class="payment-title">Pembayaran :</div>
                    <div class="payment-bank">${data.bank_name || "BCA"} ${data.bank_account || "658-090-9971"}</div>
                    <div class="payment-an">a/n. ${data.bank_an || "PT Kaya Dari Properti"}</div>
                </div>

                <div class="signature-section">
                    <svg class="watermark" viewBox="0 0 160 80">
                        <text x="20" y="35" font-family="Arial" font-weight="900" font-size="16" fill="#0E2C24" opacity="0.18">INLAND PROPERTY</text>
                    </svg>
                    <div class="director-title">Direktur,</div>
                    <div class="director-name">(${data.director_name || "Joan Setiadi"})</div>
                </div>
            </div>
        </div>

        <svg class="footer-banner" viewBox="0 0 800 125" preserveAspectRatio="none">
            <polygon points="0,0 800,25 800,38 0,13" fill="#E2B23B" />
            <polygon points="0,13 800,38 800,125 0,125" fill="#0E2C24" />
        </svg>

        <div class="footer-content">
            <div class="footer-item">📞 ${data.phone || "0813 88 805 58"}</div>
            <div class="footer-item">✉ ${data.email || "ptkayadariproperti@gmail.com"}</div>
            <div class="footer-item">📍 ${data.address || "JL.Hartono Raya blok R No:36, Modernland. Tangerang"}</div>
        </div>
    </div>
</body>
</html>`;
}