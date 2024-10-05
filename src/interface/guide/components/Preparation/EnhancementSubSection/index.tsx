import { SubSection, useAnalyzer, useInfo } from 'interface/guide/index';
import EnhancementBoxRow from 'interface/guide/components/Preparation/EnhancementSubSection/EnhancementBoxRow';
import WeaponEnhancementChecker from 'parser/shared/modules/items/WeaponEnhancementChecker';
import { Enchant } from 'common/ITEMS/Item';

interface Props {
  recommendedLegEnhancements?: Enchant[];
  recommendedWeaponEnhancements?: Record<number, Enchant[]>;
}

const EnchantmentSubSection = ({ recommendedWeaponEnhancements }: Props) => {
  const weaponEnhancementChecker = useAnalyzer(WeaponEnhancementChecker);
  const info = useInfo();
  if (!info) {
    return null;
  }

  const weaponBoxRowEntries =
    weaponEnhancementChecker?.getWeaponEnhancementBoxRowEntries(recommendedWeaponEnhancements) ??
    [];
  const enhancementBoxRowEntries = [...weaponBoxRowEntries];

  return (
    <SubSection title="Enhancements">
      <p>增强是提升你输出的简单方法。</p>
      <EnhancementBoxRow values={enhancementBoxRowEntries} />
    </SubSection>
  );
};

export default EnchantmentSubSection;
