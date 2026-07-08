export function emailLayout(content: string, previewText: string = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Oakland Tech College Essay Mentor Program</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#534AB7;border-radius:12px 12px 0 0;padding:24px 32px;">
            <p style="margin:0;color:#EEEDFE;font-size:13px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;">
              Oakland Tech College Essay Mentor Program
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e8e6de;border-right:1px solid #e8e6de;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f4f0;border:1px solid #e8e6de;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;">
            <p style="margin:0;font-size:12px;color:#888780;line-height:1.6;">
              This email was sent by the Oakland Tech College Essay Mentor Program.
              If you have questions, please contact <a href="mailto:admin@otessaymentors.org" style="color:#534AB7;">admin@otessaymentors.org</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function detailRow(label: string, value: string) {
  return `
    <tr>
<td style="padding:8px 6px 8px 0;font-size:13px;color:#888780;width:100px;vertical-align:top;">${label}</td>      <td style="padding:8px 0;font-size:13px;color:#2C2C2A;font-weight:500;word-break:break-word;">${value}</td>
    </tr>`
}

export function divider() {
  return `<hr style="border:none;border-top:1px solid #e8e6de;margin:24px 0;" />`
}

export function primaryButton(text: string, href: string) {
  return `
    <a href="${href}" style="display:inline-block;background:#534AB7;color:#EEEDFE;text-decoration:none;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px;margin-top:8px;">
      ${text}
    </a>`
}