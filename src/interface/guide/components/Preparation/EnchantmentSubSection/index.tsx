import { SubSection, useAnalyzer, useInfo } from 'interface/guide/index';
import EnchantChecker from 'parser/shared/modules/items/EnchantChecker';
import EnchantmentBoxRow from 'interface/guide/components/Preparation/EnchantmentSubSection/EnchantmentBoxRow';
import { Enchant } from 'common/ITEMS/Item';

interface Props {
  recommendedEnchantments?: Record<number, Enchant[]>;
}

const EnchantmentSubSection = ({ recommendedEnchantments }: Props) => {
  const enchantChecker = useAnalyzer(EnchantChecker);
  const info = useInfo();
  if (!enchantChecker || !info) {
    return null;
  }

  return (
    <SubSection title="Enchantments">
      <p>附魔是提升你输出的简单方法。</p>
      <EnchantmentBoxRow
        values={enchantChecker.getEnchantmentBoxRowEntries(recommendedEnchantments)}
      />
    </SubSection>
  );
};

export default EnchantmentSubSection;
