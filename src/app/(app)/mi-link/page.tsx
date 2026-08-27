import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";

export default function MiLinkPage() {
  return (
    <PageHeader title={copy.shell.nav.myLink} description={copy.common.placeholderPageDescription} />
  );
}
