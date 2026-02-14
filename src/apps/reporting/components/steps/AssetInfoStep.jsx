import { useReporting } from "../../context/ReportingContext";
import { BwAssetInfoStep } from "./BwAssetInfoStep";
import { TmdAssetInfoStep } from "./TmdAssetInfoStep";
import { GenericAssetInfoStep } from "./GenericAssetInfoStep";

export const AssetInfoStep = () => {
  const { eqType } = useReporting();
  if (eqType === "belt_weigher") return <BwAssetInfoStep />;
  if (eqType === "tmd") return <TmdAssetInfoStep />;
  return <GenericAssetInfoStep />;
};
