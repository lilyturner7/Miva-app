import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseNutritionPlan } from '@/lib/nutrition/parse-plan';

export const runtime = 'nodejs';

async function extractText(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return `\n${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join('\n');
  }

  throw new Error('Formato non supportato per l’estrazione automatica. Usa PDF, DOCX, XLS o XLSX.');
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      path?: string;
      filename?: string;
      planType?: string;
      planName?: string;
    };

    if (!body.path || !body.filename) {
      return NextResponse.json({ error: 'File mancante' }, { status: 400 });
    }

    if (!body.path.startsWith(`${authData.user.id}/`)) {
      return NextResponse.json({ error: 'Percorso file non valido' }, { status: 403 });
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from('nutrition-plans')
      .download(body.path);

    if (downloadError || !file) {
      return NextResponse.json({ error: downloadError?.message ?? 'Impossibile leggere il file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, body.filename);

    if (!text.trim()) {
      return NextResponse.json({
        error: 'Non sono riuscito a leggere testo dal documento. Potrebbe essere una scansione: in quel caso servirà il riconoscimento da immagine.',
      }, { status: 422 });
    }

    const parsed = parseNutritionPlan(text);
    const planType = body.planType || 'standard';
    const planName = body.planName || body.filename.replace(/\.[^.]+$/, '');

    const { data: plan, error: saveError } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: authData.user.id,
        name: planName,
        plan_type: planType,
        source_filename: body.filename,
        storage_path: body.path,
        parse_status: parsed.meals.length ? 'parsed' : 'needs_review',
        raw_extraction: {
          text,
          meals: parsed.meals,
          unmatched: parsed.unmatched,
        },
        confirmed_structure: {},
        is_active: true,
      })
      .select('id,name,plan_type,parse_status,raw_extraction')
      .single();

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 400 });
    }

    return NextResponse.json({
      plan,
      summary: {
        mealsFound: parsed.meals.length,
        foodsFound: parsed.meals.reduce((total, meal) => total + meal.foods.length, 0),
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Errore durante l’analisi del piano',
    }, { status: 500 });
  }
}
