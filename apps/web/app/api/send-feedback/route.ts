import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// ✅ Define the shape of expected JSON input
interface FeedbackPayload {
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message }: FeedbackPayload = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // ✅ Set up the transporter using Yahoo
    const transporter = nodemailer.createTransport({
      service: 'Yahoo',
      auth: {
        user: process.env.YAHOO_EMAIL,
        pass: process.env.YAHOO_APP_PASSWORD, // Use Yahoo app password
      },
    });

    // ✅ Send the email
    await transporter.sendMail({
      from: process.env.YAHOO_EMAIL,
      to: 'teamwegolivetoday@yahoo.com',
      subject: 'New Feedback from Early Access Page',
      text: message,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Email error:', err);
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }
}
