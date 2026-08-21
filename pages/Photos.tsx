import { Nav } from "@/components/Nav";
import { PhotoScrapbook } from "@/components/photos/PhotoScrapbook";

export function Photos() {
  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden", background: "var(--background)" }}>
      <Nav />
      <PhotoScrapbook />
    </div>
  );
}
