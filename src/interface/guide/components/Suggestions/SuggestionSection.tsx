import ParseResults from 'parser/core/ParseResults';
import { Section, useAnalyzers } from 'interface/guide/index';
import { t, Trans } from '@lingui/macro';
import Analyzer from 'parser/core/Analyzer';
import { useMemo, useState } from 'react';
import Toggle from 'react-toggle';

import Suggestions from './Suggestions';

interface SuggestionSectionProps<T extends typeof Analyzer> {
  analyzers?: T[];
}

/**
 * 可以包含在指南中的部分，以便更容易地过渡到
 * 建议部分。
 *
 * # 示例
 *
 * ```
 * <SuggestionSection analyzers={[FoodChecker, WeaponEnhancementChecker]} />
 * ```
 */
const SuggestionSection = <T extends typeof Analyzer>({ analyzers }: SuggestionSectionProps<T>) => {
  const [showMinorIssues, setShowMinorIssues] = useState(false);
  const analyzerInstances = useAnalyzers(analyzers ?? []);
  const parseResults = useMemo(() => {
    const results = new ParseResults();
    analyzerInstances.forEach((analyzer) => {
      const maybeResult = analyzer.suggestions(results.suggestions.when);
      if (maybeResult) {
        maybeResult.forEach((issue) => results.addIssue(issue));
      }
    });
    return results;
  }, [analyzerInstances]);

  return (
    <Section
      title={t({
        id: 'interface.report.results.overview.suggestions.suggestions',
        message: '建议',
      })}
    >
      <div className="flex wrapable">
        <div className="flex-main">
          <small>
            <Trans id="interface.report.results.overview.suggestions.explanation">
              根据您在这场战斗中的表现，以下是一些我们认为您可能可以改进的地方。
            </Trans>
          </small>
        </div>
        <div className="flex-sub action-buttons">
          <div className="pull-right toggle-control">
            <Toggle
              defaultChecked={showMinorIssues}
              icons={false}
              onChange={(event) => setShowMinorIssues(event.target.checked)}
              id="minor-issues-toggle"
            />
            <label htmlFor="minor-issues-toggle">
              <Trans id="interface.report.results.overview.suggestions.minorImportance">
                次要重要性
              </Trans>
            </label>
          </div>
        </div>
      </div>
      <div className="flex" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <Suggestions parseResults={parseResults} showMinorIssues={showMinorIssues} />
      </div>
      <div className="flex">
        <small>
          <Trans id="interface.report.results.overview.suggestions.improve">
            这些建议可能显得琐碎或依赖于战斗，但通常仍然是您可以改进的地方。尽量专注于一次改进一件事——不要试图一次改进所有内容。
          </Trans>
        </small>
      </div>
    </Section>
  );
};

export default SuggestionSection;
