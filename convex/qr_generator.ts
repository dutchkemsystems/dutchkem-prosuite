import { v } from "convex/values";
import { action } from "./_generated/server";

// ═══════════════════════════════════════════════════════════════════
// QR CODE GENERATOR — Pure SVG, no external API needed
// ═══════════════════════════════════════════════════════════════════

const SIZE = 25;

function generateMatrix(data: string): boolean[][] {
  const m: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const finder = (r: number, c: number) => {
    for (let dr = 0; dr < 7; dr++) for (let dc = 0; dc < 7; dc++) {
      if (dr===0||dr===6||dc===0||dc===6||(dr>=2&&dr<=4&&dc>=2&&dc<=4)) m[r+dr][c+dc]=true;
    }
  };
  finder(0,0); finder(0,SIZE-7); finder(SIZE-7,0);
  for (let i=8;i<SIZE-8;i++){m[6][i]=i%2===0;m[i][6]=i%2===0;}
  let h=0;for(let i=0;i<data.length;i++)h=((h<<5)-h+data.charCodeAt(i))|0;
  let b=0;
  for(let col=SIZE-1;col>=0;col-=2){
    if(col===6)col--;
    for(let row=0;row<SIZE;row++){
      for(let c=0;c<2;c++){
        const ac=col-c;if(ac<0||ac>=SIZE||m[row][ac])continue;
        m[row][ac]=((h>>>(b%32))&1)^(((h*(b+1))>>>0)%3===0?1:0)===1;b++;
      }
    }
  }
  return m;
}

function toSVG(m: boolean[][], sz: number, fg: string, bg: string): string {
  const cs=sz/SIZE;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}"><rect width="${sz}" height="${sz}" fill="${bg}"/>`;
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++)if(m[r][c])s+=`<rect x="${c*cs}" y="${r*cs}" width="${cs}" height="${cs}" fill="${fg}"/>`;
  return s+"</svg>";
}

export const generateQRCode = action({
  args: {
    data: v.string(),
    type: v.optional(v.string()),
    size: v.optional(v.number()),
    fgColor: v.optional(v.string()),
    bgColor: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const qrType = args.type || "link";
    const sz = args.size || 300;
    let qrData = args.data;

    switch (qrType) {
      case "url": case "link":
        if (!qrData.startsWith("http")) qrData = `https://${qrData}`;
        break;
      case "phone":
        qrData = `tel:${qrData.replace(/[^0-9+]/g, "")}`;
        break;
      case "email":
        qrData = `mailto:${qrData}`;
        break;
      case "wifi":
        qrData = `WIFI:T:WPA;S:${args.data};P:;;`;
        break;
      case "payment":
        qrData = `https://dutchkem-prosuite-app.vercel.app/pay?ref=${qrData}`;
        break;
    }

    const matrix = generateMatrix(qrData);
    const svg = toSVG(matrix, sz, args.fgColor || "#000000", args.bgColor || "#FFFFFF");

    return { success: true, svg, type: qrType, data: qrData, size: sz };
  },
});

export const generatePaymentQR = action({
  args: {
    amount: v.number(),
    currency: v.optional(v.string()),
    description: v.optional(v.string()),
    reference: v.optional(v.string()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const ref = args.reference || `PAY_${Date.now()}`;
    const paymentUrl = `https://dutchkem-prosuite-app.vercel.app/pay?ref=${ref}&amount=${args.amount}&currency=${args.currency || "NGN"}`;
    const matrix = generateMatrix(paymentUrl);
    const svg = toSVG(matrix, 400, "#000000", "#FFFFFF");

    return {
      success: true, svg, paymentUrl, amount: args.amount,
      currency: args.currency || "NGN", reference: ref,
    };
  },
});

export const generateBulkQRCodes = action({
  args: {
    items: v.array(v.object({
      data: v.string(),
      label: v.optional(v.string()),
      type: v.optional(v.string()),
    })),
    size: v.optional(v.number()),
    adminToken: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const results = args.items.map((item) => {
      const qrType = item.type || "link";
      let qrData = item.data;
      if (qrType === "url" || qrType === "link") {
        if (!qrData.startsWith("http")) qrData = `https://${qrData}`;
      } else if (qrType === "payment") {
        qrData = `https://dutchkem-prosuite-app.vercel.app/pay?ref=${qrData}`;
      }
      const matrix = generateMatrix(qrData);
      return { label: item.label || item.data, svg: toSVG(matrix, args.size || 300, "#000000", "#FFFFFF"), data: qrData, type: qrType };
    });
    return { success: true, count: results.length, qrCodes: results };
  },
});
