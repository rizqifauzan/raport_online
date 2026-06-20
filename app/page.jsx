import { loadMockup } from "../lib/mockup";

export const dynamic = "force-static";

export default function HomePage() {
  return <div dangerouslySetInnerHTML={{ __html: loadMockup("index.html") }} />;
}
