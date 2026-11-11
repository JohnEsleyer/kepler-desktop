import { ElementTransformer } from '@lexical/markdown';
import { $createHorizontalRuleNode, $isHorizontalRuleNode, HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';

export const HR_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? '---' : null;
  },
  regExp: /^(?:---|\*\*\*|___)\s*$/,
  replace: (parentNode) => {
    const hr = $createHorizontalRuleNode();
    parentNode.replace(hr);
  },
  type: 'element',
};
