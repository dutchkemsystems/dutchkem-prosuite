import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// --- OTP Endpoints (Standalone) ---

http.route({
  path: "/api/otp/send",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      let { phone } = body;
      
      if (!phone) {
        return new Response(JSON.stringify({ success: false, message: 'Phone number is required' }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      // Normalize phone number
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '234' + phone.substring(1);
      }
      if (!phone.startsWith('234')) {
        phone = '234' + phone;
      }
      
      if (phone.length !== 13) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Invalid phone number format. Use 080XXXXXXXX or 23480XXXXXXXX' 
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
      if (IS_DEVELOPMENT && !process.env.TERMII_API_KEY) {
        console.log('[OTP] Development mode: Simulating OTP send');
        return new Response(JSON.stringify({ 
          success: true, 
          pinId: 'demo_' + Date.now(),
          channel: 'demo',
          message: 'Demo OTP sent. Use any 6-digit code to verify.'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (!process.env.TERMII_API_KEY) {
        return new Response(JSON.stringify({ success: false, message: 'SMS service not configured' }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const requestBody = {
        api_key: process.env.TERMII_API_KEY,
        message_type: 'NUMERIC',
        to: phone,
        from: process.env.TERMII_SENDER_ID || 'Dutchkem',
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 10,
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: 'Your Dutchkem Ventures verification code is < 1234 >. Valid for 10 minutes.',
        pin_type: 'NUMERIC'
      };
      
      const response = await fetch('https://v3.api.termii.com/api/sms/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      if (data.pinId || data.pin_id) {
        return new Response(JSON.stringify({ success: true, pinId: data.pinId || data.pin_id, channel: 'sms' }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ success: false, message: data.message || 'Failed to send OTP', details: data }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/otp/verify",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const { pinId, pin } = await req.json();
      
      if (!pinId || !pin) {
        return new Response(JSON.stringify({ success: false, verified: false, message: 'Pin ID and PIN are required' }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (pinId.startsWith('demo_')) {
        const isValid = /^\d{6}$/.test(pin);
        return new Response(JSON.stringify({ 
          success: true, 
          verified: isValid,
          message: isValid ? 'Phone verified successfully' : 'Invalid OTP'
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      if (!process.env.TERMII_API_KEY) {
        return new Response(JSON.stringify({ success: false, verified: false, message: 'Verification service unavailable' }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      const response = await fetch('https://v3.api.termii.com/api/sms/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TERMII_API_KEY,
          pin_id: pinId,
          pin: pin
        })
      });
      
      const data = await response.json();
      const isVerified = data.verified === true || data.verified === 'True';
      
      return new Response(JSON.stringify({ 
        success: true, 
        verified: isVerified,
        message: isVerified ? 'Phone verified successfully' : 'Invalid or expired OTP'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, verified: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

// --- Agent Endpoints ---

http.route({
  path: "/api/agents/a1/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.academic_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});



http.route({
  path: "/api/agents/a2/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.business_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a3/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.content_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a4/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.career_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a5/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.shopping_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a6/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.certification_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a7/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.finance_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a8/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.video_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a9/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.wellness_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a10/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.home_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a11/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.language_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a12/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.travel_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a13/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.exam_career_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a14/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.translation_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/agents/a15/generate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const result = await ctx.runAction(internal.event_chat.generateSimpleResponse, {
      prompt
    });

    return new Response(JSON.stringify({ response: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/api/webhooks/kora",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const signature = req.headers.get("x-kora-signature") || "";
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    const verification = await ctx.runMutation(internal.guardian.verifyPayment, {
      reference: body.reference,
      amount: body.amount,
      currency: body.currency,
      ip,
      userId: body.metadata?.userId || body.userId,
      signature,
      agentId: body.metadata?.agentId,
      service: body.metadata?.service,
    });

    return new Response(JSON.stringify({ webhookStatus: "processed", ...verification }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
