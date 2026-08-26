import CategoryTabs from "@/components/category-tabs";
import Videogrid from "@/components/Videogrid";

export default function Home() {
  return (
    <main className="flex-1 p-4">
      <CategoryTabs />
      <Videogrid />
    </main>
  );
}
