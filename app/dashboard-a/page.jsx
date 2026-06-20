import { loadMockup } from "../../lib/mockup";

export const dynamic = "force-static";

export default function DashboardAPage() {
  return (
    <div dangerouslySetInnerHTML={{ __html: loadMockup("dashboard-a.html") }} />
  );
}
