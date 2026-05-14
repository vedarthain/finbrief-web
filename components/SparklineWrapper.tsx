// No longer needs dynamic import — pure SVG, no DOM APIs
import Sparkline from "./Sparkline";
import { PriceHistory } from "@/lib/queries";

export default function SparklineWrapper({
  data,
  positive,
}: {
  data: PriceHistory[];
  positive: boolean;
}) {
  return <Sparkline data={data} positive={positive} width={80} height={28} />;
}
