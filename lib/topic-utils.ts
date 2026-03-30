import nceTopics from '@/constants/nce_topics_flattened.json';

export interface NCETopic {
  id: number;
  name: string;
  nce_section: string;
  nce_weight: number;
  depth_level: number;
  full_path: string;
  parent_id: number | null;
}

export function getTopicsByDepth(depth: number): NCETopic[] {
  return nceTopics.filter((topic) => topic.depth_level === depth);
}

export function getChildTopics(parentId: number): NCETopic[] {
  return nceTopics.filter((topic) => topic.parent_id === parentId);
}

export function getTopicById(id: number): NCETopic | undefined {
  return nceTopics.find((topic) => topic.id === id);
}

export function getTopicPath(topicId: number): NCETopic[] {
  const path: NCETopic[] = [];
  let currentTopic = getTopicById(topicId);

  while (currentTopic) {
    path.unshift(currentTopic);
    currentTopic = currentTopic.parent_id
      ? getTopicById(currentTopic.parent_id)
      : undefined;
  }

  return path;
}

export function getRootTopics(): NCETopic[] {
  return getTopicsByDepth(0);
}

export function hasChildren(topicId: number): boolean {
  return getChildTopics(topicId).length > 0;
}

export function getTopicHierarchy(
  selectedTopics: (number | null)[]
): NCETopic[][] {
  const hierarchy: NCETopic[][] = [];

  hierarchy.push(getRootTopics());

  for (let i = 0; i < selectedTopics.length; i++) {
    const selectedId = selectedTopics[i];
    if (selectedId !== null) {
      const children = getChildTopics(selectedId);
      if (children.length > 0) {
        hierarchy.push(children);
      }
    }
  }

  return hierarchy;
}
