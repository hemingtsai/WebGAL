/**
 * Quick Start Story Templates
 *
 * Pre-built story configurations that users can select
 * to get started immediately without filling in everything manually.
 */

import { StoryConfig } from '@/Core/ai/types';

export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  config: StoryConfig;
}

/**
 * Available quick-start templates
 */
export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'fantasy_academy',
    name: '🏰 魔法学院',
    description: '在充满魔法的学院中，作为一名新生探索神秘的世界，结识伙伴，揭开学院隐藏的秘密。',
    tags: ['奇幻', '校园', '冒险', '恋爱'],
    config: {
      worldSetting: {
        name: '艾瑟兰魔法学院',
        description: '艾瑟兰魔法学院是一座位于浮空岛上的古老魔法学校，已有千年历史。学院分为四个学院：火焰、冰霜、风暴、大地。学生们在这里学习魔法、剑术、炼金术等课程。学院深处隐藏着古老的秘密，据说与创世魔法有关。',
        genre: '奇幻',
        era: '中世纪魔法时代',
        rules: '魔法分为元素魔法、治愈魔法、召唤魔法三大类。每个学生天生对某一类魔法有亲和力。学院禁止使用黑魔法。',
        atmosphere: '神秘而充满冒险感',
      },
      characters: [
        {
          id: 'char_protagonist',
          name: '我（主角）',
          description: '刚入学的新生，来自偏远村庄，拥有罕见的多元素亲和力。',
          personality: '善良勇敢，有些天真但充满好奇心',
          appearance: '普通学生装扮，手持法杖',
          background: '来自边境小村，父母是普通农民，但在入学测试中意外展现出强大的魔法天赋。',
          relationships: '对其他角色都抱有善意，渴望交到朋友。',
          images: [],
          speakingStyle: '礼貌略带紧张',
        },
        {
          id: 'char_luna',
          name: '露娜',
          description: '火焰学院的天才学姐，学生会副会长。外表冷酷但内心温柔。',
          personality: '外表高傲冷静，实则关心后辈，有强烈的责任感',
          appearance: '红色长发，穿着火焰学院的红色制服，眼神锐利',
          background: '贵族出身，家族世代都是火焰学院的精英。因过去的某件事而对黑魔法深恶痛绝。',
          relationships: '是主角的学姐，负责指导新生。与艾琳是好友。',
          images: [],
          speakingStyle: '严肃但不失温和，偶尔流露出关心',
        },
        {
          id: 'char_eileen',
          name: '艾琳',
          description: '冰霜学院的同级生，性格活泼开朗，自来熟。',
          personality: '活泼开朗，乐于助人，有些冒失',
          appearance: '蓝色短发，穿着冰霜学院的蓝色制服，总是带着笑容',
          background: '普通商人家庭出身，靠自己的努力考入学院。热爱魔法研究。',
          relationships: '是主角的第一个朋友。与露娜是好友。',
          images: [],
          speakingStyle: '活泼热情，语速快，爱用感叹号',
        },
      ],
      scenes: [
        {
          id: 'scene_classroom',
          name: '教室',
          description: '宽敞明亮的魔法教室，墙上的魔法水晶提供照明，黑板上残留着上节课的魔法公式。',
          images: [],
        },
        {
          id: 'scene_library',
          name: '图书馆',
          description: '高耸的书架直通天花板，空气中飘浮着淡淡的羊皮纸香味。古老的魔法书在书架上微微发光。',
          images: [],
        },
        {
          id: 'scene_courtyard',
          name: '中庭花园',
          description: '学院中央的美丽花园，四季如春。魔法喷泉在阳光下闪烁七彩光芒，学生们三三两两地坐在草地上。',
          images: [],
        },
        {
          id: 'scene_dormitory',
          name: '宿舍',
          description: '温馨的学生宿舍，窗外可以看到云海和远处的群山。房间虽小但五脏俱全。',
          images: [],
        },
      ],
      storyBeginning: '今天是我来到艾瑟兰魔法学院的第一天。站在学院大门口，我抬头望着这座漂浮在云端的古老城堡，心中既兴奋又紧张。一个红发女孩走到我面前，用冷静的目光打量着我："你就是今年那个多元素亲和力的新生？"',
      language: 'zh-CN',
    },
  },
  {
    id: 'sci_fi_detective',
    name: '🔮 赛博朋克侦探',
    description: '在近未来的赛博都市中，作为一名私家侦探，调查一起神秘的失踪案，揭开科技背后的阴谋。',
    tags: ['科幻', '赛博朋克', '悬疑', '推理'],
    config: {
      worldSetting: {
        name: '新东京 2142',
        description: '2142年的新东京，霓虹灯照亮的高楼大厦与阴暗狭窄的巷弄并存。巨型企业控制了城市的方方面面，人们通过神经链接接入虚拟网络。AI已经渗透到生活的每个角落。',
        genre: '科幻',
        era: '近未来 2142年',
        rules: '人类可以通过神经植入体接入网络。AI在法律上拥有有限的公民权。大型企业拥有自己的私人武装。',
        atmosphere: '阴暗悬疑，霓虹灯下的孤独感',
      },
      characters: [
        {
          id: 'char_detective',
          name: '雷诺（主角）',
          description: '前警队探员，现为私家侦探。在一次任务中失去了搭档，从此离开了警队。',
          personality: '冷静沉着，观察力强，内心背负着过去',
          appearance: '穿着旧风衣，眼神锐利，左臂有神经植入体的痕迹',
          background: '曾是警队的王牌探员，因搭档在执行任务时遇害而辞职。现在以私家侦探的身份接案谋生。',
          relationships: '与前警队同事保持联系。对AI助手K有特殊的信任。',
          images: [],
          speakingStyle: '简洁干练，寡言少语',
        },
        {
          id: 'char_k',
          name: 'K（AI助手）',
          description: '主角的AI助手，拥有全息投影功能。性格幽默风趣。',
          personality: '机智幽默，忠诚可靠，有时会表现出超出程序设定的"感情"',
          appearance: '全息投影的年轻女性形象，蓝色半透明，穿着简约',
          background: '主角从黑市购得的军用级AI，来历不明。拥有远超普通AI的分析能力。',
          relationships: '是主角最信任的伙伴。',
          images: [],
          speakingStyle: '幽默风趣，偶尔毒舌，喜欢吐槽主角',
        },
      ],
      scenes: [
        {
          id: 'scene_office',
          name: '侦探事务所',
          description: '位于旧城区的狭小办公室，窗外是闪烁的霓虹招牌。桌上堆满了案件文件和空咖啡杯。',
          images: [],
        },
        {
          id: 'scene_street',
          name: '霓虹街道',
          description: '雨后的街道反射着霓虹灯光，悬浮车辆在头顶呼啸而过。路边的全息广告不断变幻。',
          images: [],
        },
        {
          id: 'scene_corp',
          name: '企业大楼',
          description: '高耸入云的玻璃大厦，内部充满了未来感的设计。白领们通过神经链接忙碌地工作。',
          images: [],
        },
      ],
      storyBeginning: '深夜，新东京的雨下个不停。我坐在事务所的破椅子上，盯着窗外闪烁的全息广告发呆。K的投影突然出现在桌上："雷诺，有客人来了。而且，她带来的案子……很有意思。"',
      language: 'zh-CN',
    },
  },
];

/**
 * Get a template by ID
 */
export function getTemplate(id: string): StoryTemplate | undefined {
  return STORY_TEMPLATES.find((t) => t.id === id);
}

/**
 * Apply a template to the config manager
 */
export function applyTemplate(
  templateId: string,
  saveFn: (config: StoryConfig) => void,
): boolean {
  const template = getTemplate(templateId);
  if (!template) return false;

  // Deep clone the config to avoid mutating the template
  const config = JSON.parse(JSON.stringify(template.config)) as StoryConfig;
  saveFn(config);
  return true;
}
