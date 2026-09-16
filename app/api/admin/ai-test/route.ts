import { NextResponse } from 'next/server';
import { getGeminiPool, callGeminiWithRotation } from '@/lib/gemini-pool';

export async function GET() {
  try {
    const keys = await getGeminiPool();
    if (keys.length === 0) {
      return NextResponse.json({ error: 'No hay claves en el pool para probar.' }, { status: 400 });
    }

    const { text, keyIndexUsed, totalKeys } = await callGeminiWithRotation({
      contents: [
        { role: 'user', parts: [{ text: 'Responde únicamente la palabra "OK".' }] }
      ]
    });

    return NextResponse.json({
      success: true,
      totalKeys,
      keyIndexUsed: keyIndexUsed + 1,
      reply: text.trim(),
      message: `¡Pool de IA verificado! Funcionando correctamente con la clave #${keyIndexUsed + 1} de ${totalKeys}.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
