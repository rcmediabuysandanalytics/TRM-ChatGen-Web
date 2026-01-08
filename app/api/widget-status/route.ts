
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
        return NextResponse.json({ is_active: false, error: 'Client ID required' }, { status: 400 });
    }

    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from('widget_configs')
            .select('is_active')
            .eq('client_id', clientId)
            .single();

        if (error || !data) {
            return NextResponse.json({ is_active: false });
        }

        const response = NextResponse.json({ is_active: data.is_active ?? true });

        // Add CORS headers
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

        return response;
    } catch (error) {
        console.error('Error fetching widget status:', error);
        return NextResponse.json({ is_active: false });
    }
}

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}
