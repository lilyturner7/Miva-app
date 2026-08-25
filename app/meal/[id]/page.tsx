import MealDetail from '@/components/MealDetail';

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MealDetail mealId={id} />;
}
