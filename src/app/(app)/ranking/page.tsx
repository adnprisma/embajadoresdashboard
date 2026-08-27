import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function RankingPage() {
  return (
    <PageHeader title={copy.shell.nav.ranking} description={copy.common.placeholderPageDescription} />
  );
}
