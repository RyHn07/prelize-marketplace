import Header from "@/components/Header";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      
      <Header />

      <section className="text-center py-20 px-6">
        <h2 className="text-4xl font-bold">
          Wholesale Products from China
        </h2>

        <p className="mt-4 text-gray-400">
          Import products easily with bulk pricing and fast delivery to Bangladesh.
        </p>
      </section>

    </main>
  );
}