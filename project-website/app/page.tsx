export default function Home() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 md:px-10 md:py-12">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center px-6 py-10 md:px-16 md:py-14">
        <div className="flex w-full max-w-4xl flex-col items-center gap-8 md:gap-12">
          <h1 className="text-center text-4xl font-normal tracking-tight text-[#2f9e44] sm:text-5xl md:text-6xl">
            A robot that eats cereal
          </h1>
          <div className="flex h-[280px] w-full items-center justify-center rounded-[2.75rem] border-[10px] border-[#2f9e44] bg-white sm:h-[360px] md:h-[420px]">
            <p className="px-6 text-center text-lg text-[#2f9e44] sm:text-xl">
              Video placeholder
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
