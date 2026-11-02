export type HotspotId =
  | 'bridge'
  | 'teahouse'
  | 'wineshop'
  | 'boatman'
  | 'passerby'

export type HotspotInfo = {
  id: HotspotId
  title: string
  blurb: string
}

export const HOTSPOTS: Record<HotspotId, HotspotInfo> = {
  bridge: {
    id: 'bridge',
    title: '虹桥',
    blurb: '木石合筑的拱桥横跨汴河，桥面人流如织，是全卷最热闹的枢纽。',
  },
  teahouse: {
    id: 'teahouse',
    title: '河岸茶肆',
    blurb: '临水瓦屋，朱扉半开。往来客商在此歇脚议价，茶烟与河雾混作一气。',
  },
  wineshop: {
    id: 'wineshop',
    title: '对岸酒楼',
    blurb: '酒旗轻扬，黛瓦压檐。楼下泊船，楼上可观虹桥过往。',
  },
  boatman: {
    id: 'boatman',
    title: '船夫',
    blurb: '扁舟傍桥洞而泊，船夫正待过闸。汴河漕运，全赖这些人撑篙。',
  },
  passerby: {
    id: 'passerby',
    title: '过桥行人',
    blurb: '朱衣行人驻足桥栏，俯看河面舟楫，一幅日常却入画的瞬间。',
  },
}
