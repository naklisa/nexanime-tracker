import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ success: false, error: 'Bad Request: Missing fields' }, { status: 400 });
    }

    // Upsert subscription (if endpoint exists, update keys, else insert new)
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
      }, {
        onConflict: 'endpoint'
      });

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'Subscription saved.' });
  } catch (err) {
    console.error('Error saving subscription:', err);
    return NextResponse.json({ success: false, error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Bad Request: Missing endpoint' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'Subscription deleted.' });
  } catch (err) {
    console.error('Error deleting subscription:', err);
    return NextResponse.json({ success: false, error: (err as Error).message || 'Internal Server Error' }, { status: 500 });
  }
}
