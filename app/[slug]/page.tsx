import { redirect } from 'next/navigation';

export default async function ClubPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  // Por ahora, redirigimos al registro si alguien entra a la raíz del club
  redirect(`/${slug}/registro`);
}
