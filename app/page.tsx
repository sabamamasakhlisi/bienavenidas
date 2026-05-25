import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center main-contaner">
      <h2 className="main-title">
        <span>BIEN</span>
        <span className="bask-font">*</span>
        <span>VENIDAS</span>
      </h2>
      <main>
        <Image
          className="main-logo"
          src="/banner-logo.svg"
          alt="bienavenidas logo"
          width={100}
          height={100}
          priority
        />
      </main>
    </div>
  );
}
