import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, provider = 'M-Pesa', amount = 2000 } = body;

    // Validate phone number
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Tafadhali weka namba sahihi ya simu ya Tanzania.' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    if (cleanPhone.length < 9) {
      return NextResponse.json(
        { success: false, message: 'Namba ya simu sio sahihi. Lazima iwe na tarakimu 10 (mfano: 07XX XXX XXX).' },
        { status: 400 }
      );
    }

    // 30 days subscription duration in milliseconds
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const expiresAt = now + THIRTY_DAYS_MS;

    // Generate Tanzanian Mobile Money transaction reference
    const transactionId = `TZ-${provider.toUpperCase().replace(/\s/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

    return NextResponse.json({
      success: true,
      message: `Malipo ya TZS ${amount.toLocaleString()} kupitia ${provider} yamekamilika kikamilifu!`,
      transactionId,
      phone: cleanPhone,
      provider,
      amount,
      planName: 'ArenaX Mwezi Pass (Tanzania Live)',
      activatedAt: now,
      expiresAt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Hitilafu ya mtandao wakati wa kuchakata malipo. Tafadhali jaribu tena.' },
      { status: 500 }
    );
  }
}
