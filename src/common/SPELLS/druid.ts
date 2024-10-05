/**
 * All Druid abilities except talents go in here. You can also put a talent in here if you want to override something imported in the `./talents` folder, but that should be extremely rare.
 * You need to do this manually, usually an easy way to do this is by opening a WCL report and clicking the icons of spells to open the relevant Wowhead pages, here you can get the icon name by clicking the icon, copy the name of the spell and the ID is in the URL.
 * You can access these entries like other entries in the spells files by importing `common/SPELLS` and using the assigned property on the SPELLS object. Please try to avoid abbreviating properties.
 */
import Spell from 'common/SPELLS/Spell';

const spells = {
  HIBERNATE: {
    id: 2637,
    name: '休眠',
    icon: 'spell_nature_sleep',
  },
  SOOTHE: {
    id: 2908,
    name: '安抚',
    icon: 'ability_hunter_beastsoothe',
  },
  REVIVE: {
    id: 50769,
    name: '起死回生',
    icon: 'ability_druid_lunarguidance',
  },
  TYPHOON: {
    id: 61391,
    name: '台风',
    icon: 'ability_druid_typhoon',
  },
  TREANT_FORM: {
    id: 114282,
    name: '树人形态',
    icon: 'ability_druid_treeoflife',
  },
  CHARM_WOODLAND_CREATURE: {
    id: 127757,
    name: '魅惑林地生物',
    icon: 'inv_misc_rabbit',
  },
  TELEPORT_MOONGLADE: {
    id: 18960,
    name: '传送：月光林地',
    icon: 'spell_arcane_teleportmoonglade',
  },
  TELEPORT_DREAMWALK: {
    id: 193753,
    name: '梦境行者',
    icon: 'spell_arcane_teleportstormwind',
  },
  FELINE_SWIFTNESS: {
    id: 131768,
    name: '豹之迅捷',
    icon: 'spell_druid_tirelesspursuit',
  },
  FLAP: {
    id: 164862,
    name: '振翅',
    icon: 'inv_feather_12',
  },
  WILD_CHARGE_TALENT: {
    id: 102401,
    name: '野性冲锋',
    icon: 'spell_druid_wildcharge',
  },
  WILD_CHARGE_MOONKIN: {
    id: 102383,
    name: '野性冲锋',
    icon: 'ability_druid_owlkinfrenzy',
  },
  WILD_CHARGE_CAT: {
    id: 49376,
    name: '野性冲锋',
    icon: 'spell_druid_feralchargecat',
  },
  WILD_CHARGE_BEAR: {
    id: 16979,
    name: '野性冲锋',
    icon: 'ability_hunter_pet_bear',
  },
  WILD_CHARGE_TRAVEL: {
    id: 102417,
    name: '野性冲锋',
    icon: 'trade_archaeology_antleredcloakclasp',
  },
  HEART_OF_THE_WILD_BALANCE_AFFINITY: {
    id: 108291,
    name: '野性之心',
    icon: 'spell_holy_blessingofagility',
  },
  HEART_OF_THE_WILD_FERAL_AFFINITY: {
    id: 108292,
    name: '野性之心',
    icon: 'spell_holy_blessingofagility',
  },
  HEART_OF_THE_WILD_GUARDIAN_AFFINITY: {
    id: 108293,
    name: '野性之心',
    icon: 'spell_holy_blessingofagility',
  },
  HEART_OF_THE_WILD_RESTO_AFFINITY: {
    id: 108294,
    name: '野性之心',
    icon: 'spell_holy_blessingofagility',
  },
  CONVOKE_SPIRITS: {
    id: 391528,
    name: '万灵之召',
    icon: 'ability_ardenweald_druid',
  },
  ADAPTIVE_SWARM: {
    id: 391888,
    name: '激变蜂群',
    icon: 'ability_maldraxxus_druid',
  },
  ADAPTIVE_SWARM_HEAL: {
    id: 391891,
    name: '激变蜂群',
    icon: 'ability_maldraxxus_druid',
  },
  ADAPTIVE_SWARM_DAMAGE: {
    id: 391889,
    name: '激变蜂群',
    icon: 'ability_maldraxxus_druid',
  },
  MOONKIN_FORM_AFFINITY: {
    id: 197625,
    name: '枭兽形态',
    icon: 'spell_nature_forceofnature',
  },
  STARSURGE_AFFINITY: {
    id: 197626,
    name: '星涌术',
    icon: 'spell_arcane_arcane03',
  },
  STARFIRE_AFFINITY: {
    id: 197628,
    name: '星火术',
    icon: 'spell_arcane_starfire',
  },
  SUNFIRE_AFFINITY: {
    id: 197630,
    name: '阳炎术',
    icon: 'ability_mage_firestarter',
  },
  FRENZIED_REGENERATION: {
    id: 22842,
    name: '狂暴回复',
    icon: 'ability_bullrush',
  },
  INCARNATION_CHOSEN_OF_ELUNE: {
    id: 102560,
    name: '化身：艾露恩之眷',
    icon: 'spell_druid_incarnation',
  },
  BEAR_FORM: {
    id: 5487,
    name: '熊形态',
    icon: 'ability_racial_bearform',
  },
  CAT_FORM: {
    id: 768,
    name: '猎豹形态',
    icon: 'ability_druid_catform',
  },
  DASH: {
    id: 1850,
    name: '急奔',
    icon: 'ability_druid_dash',
  },
  STAG_FORM: {
    id: 210053,
    name: '坐骑形态',
    icon: 'inv_stagform',
  },
  TRAVEL_FORM: {
    id: 783,
    name: '旅行形态',
    icon: 'ability_druid_travelform',
  },
  SHRED: {
    id: 5221,
    name: '撕碎',
    icon: 'spell_shadow_vampiricaura',
  },
  WRATH: {
    id: 5176,
    name: '愤怒',
    icon: 'spell_nature_wrathv2',
  },
  URSOLS_VORTEX: {
    id: 102793,
    name: '乌索尔旋风',
    icon: 'spell_druid_ursolsvortex',
  },
  MOONKIN_FORM: {
    id: 24858,
    name: '枭兽形态',
    icon: 'spell_nature_forceofnature',
  },
  NATURES_VIGIL_DAMAGE: {
    id: 124991,
    name: '自然的守护',
    icon: 'achievement_zone_feralas',
  },
  MASTERY_HARMONY: {
    id: 77495,
    name: '精通：相生',
    icon: 'spell_nature_healingway',
  },
  TRANQUILITY_CAST: {
    id: 740,
    name: '宁静',
    icon: 'spell_nature_tranquility',
    manaCost: 1840,
  },
  TRANQUILITY_HEAL: {
    id: 157982,
    name: '宁静',
    icon: 'spell_nature_tranquility',
  },
  INNERVATE: {
    id: 29166,
    name: '激活',
    icon: 'spell_nature_lightning',
  },
  IRONBARK: {
    id: 102342,
    name: '铁木树皮',
    icon: 'spell_druid_ironbark',
  },
  BARKSKIN: {
    id: 22812,
    name: '树皮术',
    icon: 'spell_nature_stoneclawtotem',
  },
  WILD_GROWTH: {
    id: 48438,
    name: '野性成长',
    icon: 'ability_druid_flourish',
    manaCost: 2200,
  },
  REJUVENATION: {
    id: 774,
    name: '回春术',
    icon: 'spell_nature_rejuvenation',
    manaCost: 1100,
  },
  REGROWTH: {
    id: 8936,
    name: '愈合',
    icon: 'spell_nature_resistnature',
    manaCost: 1700,
  },
  LIFEBLOOM_HOT_HEAL: {
    id: 33763,
    name: '生命绽放',
    icon: 'inv_misc_herb_felblossom',
    manaCost: 800,
  },
  LIFEBLOOM_UNDERGROWTH_HOT_HEAL: {
    id: 188550,
    name: '生命绽放',
    icon: 'inv_misc_herb_felblossom',
    manaCost: 800,
  },
  LIFEBLOOM_BLOOM_HEAL: {
    id: 33778,
    name: '生命绽放',
    icon: 'inv_misc_herb_felblossom',
  },
  CLEARCASTING_BUFF: {
    id: 16870,
    name: '节能施法',
    icon: 'spell_shadow_manaburn',
  },
  EFFLORESCENCE_CAST: {
    id: 145205,
    name: '百花齐放',
    icon: 'inv_misc_herb_talandrasrose',
    manaCost: 1700,
  },
  EFFLORESCENCE_HEAL: {
    id: 81269,
    name: '百花齐放',
    icon: 'inv_misc_herb_talandrasrose',
  },
  CENARION_WARD_HEAL: {
    id: 102352,
    name: '塞纳里奥结界',
    icon: 'ability_druid_naturalperfection',
  },
  SWIFTMEND: {
    id: 18562,
    name: '迅捷治愈',
    icon: 'inv_relics_idolofrejuvenation',
    manaCost: 800,
  },
  ABUNDANCE_BUFF: {
    id: 207640,
    name: '丰饶',
    icon: 'ability_druid_empoweredrejuvination',
  },
  NATURES_CURE: {
    id: 88423,
    name: '自然之愈',
    icon: 'ability_shaman_cleansespirit',
  },
  REJUVENATION_GERMINATION: {
    id: 155777,
    name: '回春术（萌芽）',
    icon: 'spell_druid_germination',
  },
  CULTIVATION: {
    id: 200389,
    name: '栽培',
    icon: 'ability_druid_nourish',
  },
  YSERAS_GIFT_OTHERS: {
    id: 145110,
    name: '伊瑟拉之赐',
    icon: 'spell_nature_healingtouch',
  },
  YSERAS_GIFT_SELF: {
    id: 145109,
    name: '伊瑟拉之赐',
    icon: 'spell_nature_healingtouch',
  },
  MARK_OF_SHIFTING: {
    id: 224392,
    name: '变形印记',
    icon: 'spell_druid_tirelesspursuit',
  },
  NATURES_ESSENCE_DRUID: {
    id: 189800,
    name: '自然精华',
    icon: 'ability_druid_flourish',
  },
  SPRING_BLOSSOMS: {
    id: 207386,
    name: '春暖花开',
    icon: 'inv_misc_trailofflowers',
  },
  NOURISH: {
    id: 50464,
    name: '滋养',
    icon: 'ability_druid_nourish',
  },
  SOUL_OF_THE_FOREST_BUFF: {
    id: 114108,
    name: '丛林之魂',
    icon: 'ability_druid_manatree',
  },
  INCARNATION_TOL_ALLOWED: {
    id: 117679,
    name: '化身',
    icon: 'spell_druid_incarnation',
  },
  NATURES_SWIFTNESS: {
    id: 132158,
    name: '自然迅捷',
    icon: 'spell_nature_ravenform',
  },
  GROVE_TENDING: {
    id: 383193,
    name: '林地护理',
    icon: 'inv_relics_idolofrejuvenation',
  },
  REGENERATIVE_HEARTWOOD: {
    id: 392117,
    name: '再生心木',
    icon: 'ability_druid_manatree',
  },
  EMBRACE_OF_THE_DREAM: {
    id: 392147,
    name: '梦境之拥',
    icon: 'ability_druid_healinginstincts',
  },
  VERDANCY: {
    id: 392329,
    name: '新绿',
    icon: 'inv_10_herb_seed_magiccolor5',
  },
  POWER_OF_THE_ARCHDRUID: {
    id: 392303,
    name: '大德鲁伊的力量',
    icon: 'spell_druid_rampantgrowth',
  },
  THRIVING_VEGETATION: {
    id: 447132,
    name: '欣荣植被',
    icon: 'spell_nature_rejuvenation',
  },
  ASTRAL_HARMONY: {
    id: 232378,
    name: '星界和谐',
    icon: 'talentspec_druid_restoration',
  },
  RESTO_DRUID_TIER_28_2P_SET_BONUS: {
    id: 364365,
    name: '复苏之花',
    icon: 'spell_unused',
  },
  RESTO_DRUID_TIER_28_4P_SET_BONUS: {
    id: 363495,
    name: '幻磷化身',
    icon: 'spell_progenitor_orb2',
  },
  TOUCH_THE_COSMOS: {
    id: 394414,
    name: '浩瀚之触',
    icon: 'ability_bossgorefiend_touchofdoom',
  },
  RENEWING_BLOOM: {
    id: 364686,
    name: '复苏之花',
    icon: 'spell_unused',
  },
  NATURES_ESSENCE_TRAIT: {
    id: 189787,
    name: '自然精华',
    icon: 'ability_druid_flourish',
  },
  CRITICAL_GROWTH: {
    id: 394565,
    name: '临界成长',
    icon: 'ability_druid_flourish',
  },
  TENACIOUS_FLOURISHING: {
    id: 408546,
    name: '久远繁盛',
    icon: 'talentspec_druid_restoration',
  },
  GROVE_GUARDIANS_SWIFTMEND: {
    id: 422094,
    name: '迅捷治愈',
    icon: 'inv_relics_idolofrejuvenation',
  },
  GROVE_GUARDIANS_NOURISH: {
    id: 422090,
    name: '滋养',
    icon: 'ability_druid_nourish',
  },
  GROVE_GUARDIANS_WILD_GROWTH: {
    id: 422382,
    name: '野性成长',
    icon: 'ability_druid_flourish',
  },
  T31_TREANT_CLEAVE_NOURISH: {
    id: 423612,
    name: '滋养',
    icon: 'ability_druid_nourish',
  },
  T31_CAST_CLEAVE_NOURISH: {
    id: 423618,
    name: '滋养',
    icon: 'ability_druid_nourish',
  },
  THICK_HIDE: {
    id: 16931,
    name: '厚皮',
    icon: 'inv_misc_pelt_bear_03',
  },
  SWIPE_BEAR: {
    id: 213771,
    name: '横扫',
    icon: 'inv_misc_monsterclaw_03',
  },
  MANGLE_BEAR: {
    id: 33917,
    name: '裂伤',
    icon: 'ability_druid_mangle2',
  },
  THRASH_BEAR: {
    id: 77758,
    name: '痛击',
    icon: 'spell_druid_thrash',
  },
  THRASH_BEAR_DOT: {
    id: 192090,
    name: '痛击',
    icon: 'spell_druid_thrash',
  },
  SURVIVAL_INSTINCTS: {
    id: 61336,
    name: '生存本能',
    icon: 'ability_druid_tigersroar',
  },
  IRONFUR: {
    id: 192081,
    name: '铁鬃',
    icon: 'ability_druid_ironfur',
  },
  TOOTH_AND_CLAW_BUFF: {
    id: 135286,
    name: '尖牙与利爪',
    icon: 'inv_misc_monsterfang_01',
  },
  TOOTH_AND_CLAW_DEBUFF: {
    id: 135601,
    name: '尖牙与利爪',
    icon: 'inv_misc_monsterfang_01',
  },
  STAMPEDING_ROAR_HUMANOID: {
    id: 106898,
    name: '狂奔怒吼',
    icon: 'spell_druid_stamedingroar',
  },
  STAMPEDING_ROAR_CAT: {
    id: 77764,
    name: '狂奔怒吼',
    icon: 'spell_druid_stampedingroar_cat',
  },
  STAMPEDING_ROAR_BEAR: {
    id: 77761,
    name: '狂奔怒吼',
    icon: 'spell_druid_stamedingroar',
  },
  INCAPACITATING_ROAR: {
    id: 99,
    name: '夺魂咆哮',
    icon: 'ability_druid_demoralizingroar',
  },
  MOONFIRE_DEBUFF: {
    id: 164812,
    name: '月火术',
    icon: 'spell_nature_starfall',
  },
  MOONFIRE_CAST: {
    id: 8921,
    name: '月火术',
    icon: 'spell_nature_starfall',
  },
  PERPETUAL_SPRING_TRAIT: {
    id: 200402,
    name: '永恒之春',
    icon: 'spell_nature_stoneclawtotem',
  },
  EMBRACE_OF_THE_NIGHTMARE: {
    id: 200855,
    name: '梦魇之拥',
    icon: 'inv_misc_herb_nightmarevine',
  },
  SCINTILLATING_MOONLIGHT: {
    id: 238049,
    name: '耀眼月光',
    icon: 'spell_nature_starfall',
  },
  WILDFLESH_TRAIT: {
    id: 200400,
    name: '荒野血肉',
    icon: 'ability_bullrush',
  },
  FLESHKNITTING_TRAIT: {
    id: 238085,
    name: '血肉交织',
    icon: 'ability_bullrush',
  },
  BEAR_HUG_TRAIT: {
    id: 215799,
    name: '巨熊拥抱',
    icon: 'spell_druid_bearhug',
  },
  GORE_BEAR: {
    id: 93622,
    name: '淤血',
    icon: 'ability_druid_mangle2',
  },
  BRAMBLES_DAMAGE: {
    id: 213709,
    name: '刺藤',
    icon: 'inv_misc_thornnecklace',
  },
  YSERAS_GIFT_BEAR: {
    id: 145108,
    name: '伊瑟拉之赐',
    icon: 'inv_misc_head_dragon_green',
  },
  MAUL: {
    id: 6807,
    name: '重殴',
    icon: 'ability_druid_maul',
  },
  GROWL: {
    id: 6795,
    name: '低吼',
    icon: 'ability_physical_taunt',
  },
  SKULL_BASH: {
    id: 106839,
    name: '迎头痛击',
    icon: 'inv_bone_skull_04',
  },
  REBIRTH: {
    id: 20484,
    name: '复生',
    icon: 'spell_nature_reincarnation',
  },
  ENTANGLING_ROOTS: {
    id: 339,
    name: '纠缠根须',
    icon: 'spell_nature_stranglevines',
  },
  REMOVE_CORRUPTION: {
    id: 2782,
    name: '清除腐蚀',
    icon: 'spell_holy_removecurse',
  },
  GALACTIC_GUARDIAN: {
    id: 213708,
    name: '星河守护者',
    icon: 'spell_frost_iceclaw',
  },
  GUARDIAN_OF_ELUNE: {
    id: 213680,
    name: '艾露恩的卫士',
    icon: 'spell_druid_guardianofelune',
  },
  URSOCS_ENDURANCE: {
    id: 200399,
    name: '乌索尔的坚韧',
    icon: 'ability_hunter_pet_bear',
  },
  PULVERIZE_BUFF: {
    id: 158792,
    name: '粉碎',
    icon: 'spell_druid_malfurionstenacity',
  },
  SKYSECS_HOLD_HEAL: {
    id: 208218,
    name: '斯凯塞克的坚守',
    icon: 'spell_druid_bearhug',
  },
  BLOOD_FRENZY_TICK: {
    id: 203961,
    name: '血性狂乱',
    icon: 'ability_druid_primaltenacity',
  },
  BRISTLING_FUR: {
    id: 204031,
    name: '鬃毛倒竖',
    icon: 'spell_druid_bristlingfur',
  },
  OAKHEARTS_PUNY_QUODS_BUFF: {
    id: 236479,
    name: '橡树之心的迷你牢笼',
    icon: 'spell_druid_bearhug',
  },
  EARTHWARDEN_BUFF: {
    id: 203975,
    name: '大地守卫者',
    icon: 'spell_shaman_blessingofeternals',
  },
  GORY_FUR_BUFF: {
    id: 201671,
    name: '血污毛皮',
    icon: 'artifactability_guardiandruid_goryfur',
  },
  FURY_OF_NATURE_HEAL: {
    id: 248522,
    name: '自然之怒',
    icon: 'ability_creature_cursed_04',
  },
  BERSERK_BEAR: {
    id: 50334,
    name: '狂暴',
    icon: 'ability_druid_berserk',
  },
  INCARNATION_GUARDIAN_OF_URSOC: {
    id: 102558,
    name: '化身：乌索克的守护者',
    icon: 'spell_druid_incarnation',
  },
  GUARDIAN_TIER_21_2P_SET_BONUS: {
    id: 251791,
    name: 'Item - Druid  T21 Guardian 2P Bonus',
    icon: 'ability_druid_cower',
  },
  GUARDIAN_TIER_21_4P_SET_BONUS: {
    id: 251792,
    name: 'Item - Druid  T21 Guardian 4P Bonus',
    icon: 'ability_druid_cower',
  },
  GUARDIAN_TIER_21_4P_SET_BONUS_BUFF: {
    id: 253575,
    name: '复苏毛皮',
    icon: 'ability_druid_kingofthejungle',
  },
  MASTERY_NATURES_GUARDIAN_HEAL: {
    id: 227034,
    name: '自然守护者',
    icon: 'spell_druid_primaltenacity',
  },
  ASTRAL_INFLUENCE: {
    id: 197524,
    name: '星界支配',
    icon: 'ability_skyreach_lens_flare',
  },
  STARSURGE_MOONKIN: {
    id: 78674,
    name: '星涌术',
    icon: 'spell_arcane_arcane03',
  },
  STARFIRE: {
    id: 194153,
    name: '星火术',
    icon: 'spell_arcane_starfire',
  },
  WRATH_MOONKIN: {
    id: 190984,
    name: '愤怒',
    icon: 'spell_nature_wrathv2',
  },
  SUNFIRE: {
    id: 164815,
    name: '阳炎术',
    icon: 'ability_mage_firestarter',
  },
  SUNFIRE_CAST: {
    id: 93402,
    name: '阳炎术',
    icon: 'ability_mage_firestarter',
  },
  STARLORD: {
    id: 279709,
    name: '星辰领主',
    icon: 'spell_shaman_measuredinsight',
  },
  STARFALL: {
    id: 191037,
    name: '星辰坠落',
    icon: 'ability_druid_starfall',
  },
  STARFALL_CAST: {
    id: 191034,
    name: '星辰坠落',
    icon: 'ability_druid_starfall',
  },
  FULL_MOON: {
    id: 274283,
    name: '满月',
    icon: 'artifactability_balancedruid_fullmoon',
  },
  HALF_MOON: {
    id: 274282,
    name: '半月',
    icon: 'artifactability_balancedruid_halfmoon',
  },
  CELESTIAL_ALIGNMENT: {
    id: 194223,
    name: '超凡之盟',
    icon: 'spell_nature_natureguardian',
  },
  CELESTIAL_ALIGNMENT_ORBITAL_STRIKE: {
    id: 383410,
    name: '超凡之盟',
    icon: 'spell_nature_natureguardian',
  },
  INCARNATION_ORBITAL_STRIKE: {
    id: 390414,
    name: '化身：艾露恩之眷',
    icon: 'spell_druid_incarnation',
  },
  NATURES_GRACE: {
    id: 393959,
    name: '自然的优雅',
    icon: 'spell_nature_naturesblessing',
  },
  OWLKIN_FRENZY: {
    id: 157228,
    name: '枭兽狂怒',
    icon: 'ability_druid_owlkinfrenzy',
  },
  SOLAR_BEAM: {
    id: 78675,
    name: '日光术',
    icon: 'ability_vehicle_sonicshockwave',
  },
  SHOOTING_STARS: {
    id: 202497,
    name: '坠星',
    icon: 'spell_priest_divinestar_shadow2',
  },
  ECLIPSE: {
    id: 79577,
    name: '日月之蚀',
    icon: 'ability_druid_eclipseorange',
  },
  ECLIPSE_SOLAR: {
    id: 48517,
    name: '日蚀',
    icon: 'ability_druid_eclipseorange',
  },
  ECLIPSE_LUNAR: {
    id: 48518,
    name: '月蚀',
    icon: 'ability_druid_eclipse',
  },
  MASTERY_TOTAL_ECLIPSE: {
    id: 326085,
    name: '精通：日月齐喑',
    icon: 'ability_druid_eclipse',
  },
  CYCLONE: {
    id: 33786,
    name: '旋风',
    icon: 'spell_nature_earthbind',
  },
  FURY_OF_ELUNE_DAMAGE: {
    id: 211545,
    name: '艾露恩之怒',
    icon: 'ability_druid_dreamstate',
  },
  FURY_OF_ELUNE_DAMAGE_SUNDERED_FIRMAMENT: {
    id: 394111,
    name: '艾露恩之怒',
    icon: 'ability_druid_dreamstate',
  },
  SUNDERED_FIRMAMENT_RESOURCE: {
    id: 394108,
    name: '碎裂天穹',
    icon: 'spell_druid_equinox',
  },
  WANING_TWILIGHT: {
    id: 393957,
    name: '阑珊暮光',
    icon: 'spell_shadow_twilight',
  },
  GATHERING_STARSTUFF: {
    id: 394412,
    name: '摘星揽月',
    icon: 'spell_nature_wrathv2',
  },
  BALANCE_OF_ALL_THINGS_LUNAR: {
    id: 394050,
    name: '万物平衡',
    icon: 'ability_druid_earthandsky',
  },
  BALANCE_OF_ALL_THINGS_SOLAR: {
    id: 394049,
    name: '万物平衡',
    icon: 'ability_druid_earthandsky',
  },
  FRIEND_OF_THE_FAE: {
    id: 394083,
    name: '法夜之友',
    icon: 'inv_elemental_primal_mana',
  },
  RATTLED_STARS: {
    id: 393955,
    name: '星辰轰鸣',
    icon: 'spell_arcane_arcane01',
  },
  STARWEAVERS_WARP: {
    id: 393942,
    name: '织星者的经纱',
    icon: 'ability_druid_stellarflare',
  },
  STARWEAVERS_WEFT: {
    id: 393944,
    name: '织星者的纬纱',
    icon: 'spell_arcane_invocation',
  },
  WILD_MUSHROOM: {
    id: 88751,
    name: '野性蘑菇',
    icon: 'druid_ability_wildmushroom_b',
  },
  ORBITAL_STRIKE: {
    id: 361237,
    name: '轨道打击',
    icon: 'spell_nature_natureguardian',
  },
  CRASHING_STAR: {
    id: 408310,
    name: '坠落之星',
    icon: 'ability_druid_starfall',
  },
  WARRIOR_OF_ELUNE: {
    id: 202425,
    name: '艾露恩的战士',
    icon: 'spell_holy_elunesgrace',
  },
  SWIPE_CAT: {
    id: 106785,
    name: '横扫',
    icon: 'inv_misc_monsterclaw_03',
  },
  FEROCIOUS_BITE: {
    id: 22568,
    name: '凶猛撕咬',
    icon: 'ability_druid_ferociousbite',
  },
  RIP: {
    id: 1079,
    name: '割裂',
    icon: 'ability_ghoulfrenzy',
  },
  TIGERS_FURY: {
    id: 5217,
    name: '猛虎之怒',
    icon: 'ability_mount_jungletiger',
  },
  SKULL_BASH_FERAL: {
    id: 93985,
    name: '迎头痛击',
    icon: 'inv_bone_skull_04',
  },
  PRIMAL_FURY: {
    id: 16953,
    name: '原始狂怒',
    icon: 'ability_racial_cannibalize',
  },
  MAIM: {
    id: 22570,
    name: '割碎',
    icon: 'ability_druid_mangle',
  },
  MAIM_DEBUFF: {
    id: 203123,
    name: '割碎',
    icon: 'ability_druid_mangle',
  },
  RAKE: {
    id: 1822,
    name: '斜掠',
    icon: 'ability_druid_disembowel',
  },
  RAKE_BLEED: {
    id: 155722,
    name: '斜掠',
    icon: 'ability_druid_disembowel',
  },
  RAKE_STUN: {
    id: 163505,
    name: '斜掠',
    icon: 'ability_druid_disembowel',
  },
  MOONFIRE_FERAL: {
    id: 155625,
    name: '月火术',
    icon: 'spell_nature_starfall',
  },
  THRASH_FERAL: {
    id: 106830,
    name: '痛击',
    icon: 'spell_druid_thrash',
  },
  THRASH_FERAL_BLEED: {
    id: 405233,
    name: '痛击',
    icon: 'spell_druid_thrash',
  },
  BERSERK_CAT: {
    id: 106951,
    name: '狂暴',
    icon: 'ability_druid_berserk',
  },
  BERSERK_ENERGIZE: {
    id: 343216,
    name: '狂暴',
    icon: 'ability_druid_berserk',
  },
  PROWL: {
    id: 5215,
    name: '潜行',
    icon: 'ability_druid_prowl',
  },
  PROWL_INCARNATION: {
    id: 102547,
    name: '潜行',
    icon: 'ability_druid_prowl',
  },
  BLOODTALONS_BUFF: {
    id: 145152,
    name: '血腥爪击',
    icon: 'spell_druid_bloodythrash',
  },
  FERAL_FRENZY_DEBUFF: {
    id: 274838,
    name: '野性狂乱',
    icon: 'ability_druid_rake',
  },
  CLEARCASTING_FERAL: {
    id: 135700,
    name: '节能施法',
    icon: 'spell_shadow_manaburn',
  },
  INFECTED_WOUNDS_DEBUFF: {
    id: 58180,
    name: '感染伤口',
    icon: 'ability_druid_infectedwound',
  },
  MASTERY_RAZOR_CLAWS: {
    id: 77493,
    name: '精通：剃刀之爪',
    icon: 'inv_misc_monsterclaw_05',
  },
  PREDATORY_SWIFTNESS: {
    id: 69369,
    name: '掠食者的迅捷',
    icon: 'ability_hunter_pet_cat',
  },
  INCARNATION_AOA_ALLOWED: {
    id: 252071,
    name: '化身：阿莎曼之灵',
    icon: 'ability_mount_siberiantigermount',
  },
  SOUL_OF_THE_FOREST_FERAL_ENERGY: {
    id: 114113,
    name: '丛林之魂',
    icon: 'ability_druid_manatree',
  },
  PRIMAL_CLAWS: {
    id: 393617,
    name: '原始利爪',
    icon: 'ability_druid_rake',
  },
  SABERTOOTH: {
    id: 391722,
    name: '剑齿利刃',
    icon: 'inv_misc_monsterfang_01',
  },
  TEAR: {
    id: 391356,
    name: '撕裂',
    icon: 'artifactability_feraldruid_ashamanesbite',
  },
  RAMPANT_FEROCITY: {
    id: 391710,
    name: '野性难驯',
    icon: 'ability_druid_primaltenacity',
  },
  SUDDEN_AMBUSH_BUFF: {
    id: 391974,
    name: '骤然突袭',
    icon: 'ability_hunter_catlikereflexes',
  },
  FRENZIED_ASSAULT: {
    id: 391140,
    name: '狂乱攻击',
    icon: 'ability_deathwing_bloodcorruption_earth',
  },
  APEX_PREDATORS_CRAVING_BUFF: {
    id: 391882,
    name: '顶级捕食者的渴望',
    icon: 'ability_druid_primaltenacity',
  },
  FRANTIC_MOMENTUM: {
    id: 391876,
    name: '狂乱动能',
    icon: 'spell_druid_savagery',
  },
  CATS_CURIOSITY: {
    id: 339145,
    name: '猫眼奇珍',
    icon: 'inv_jewelcrafting_gem_30',
  },
  DIRE_FIXATION_DEBUFF: {
    id: 417713,
    name: '恐怖凝视',
    icon: 'ability_druid_primalprecision',
  },
  FERAL_DRUID_T19_2SET_BONUS_BUFF: {
    id: 211140,
    name: '套装特效占位',
    icon: 'trade_engineering',
  },
  FERAL_DRUID_T19_4SET_BONUS_BUFF: {
    id: 211142,
    name: '套装特效占位',
    icon: 'trade_engineering',
  },
  FERAL_DRUID_T20_2SET_BONUS_BUFF: {
    id: 242234,
    name: 'Item - Druid T20 Feral 2P Bonus',
    icon: 'ability_druid_catform',
  },
  ENERGETIC_RIP: {
    id: 245591,
    name: '能量割裂',
    icon: 'ability_deathwing_bloodcorruption_earth',
  },
  SAVAGE_FURY_BUFF: {
    id: 449646,
    name: '野蛮暴怒',
    icon: 'ability_druid_kingofthejungle',
  },
  FERAL_DRUID_T20_4SET_BONUS_BUFF: {
    id: 242235,
    name: 'Item - Druid T20 Feral 4P Bonus',
    icon: 'ability_druid_catform',
  },
  FERAL_DRUID_T21_2SET_BONUS_BUFF: {
    id: 251789,
    name: 'Item - Druid  T21 Feral 2P Bonus',
    icon: 'ability_druid_cower',
  },
  HEART_OF_THE_LION: {
    id: 364416,
    name: '狮王之心',
    icon: 'spell_progenitor_beam',
  },
  SICKLE_OF_THE_LION: {
    id: 363830,
    name: '狮王之镰',
    icon: 'ability_xavius_tormentingswipe',
  },
  BLOODY_GASH: {
    id: 252750,
    name: '血腥伤口',
    icon: 'artifactability_feraldruid_ashamanesbite',
  },
  FERAL_DRUID_T21_4SET_BONUS_BUFF: {
    id: 251790,
    name: 'Item - Druid  T21 Feral 4P Bonus',
    icon: 'ability_druid_cower',
  },
  APEX_PREDATOR: {
    id: 252752,
    name: '顶级捕食者',
    icon: 'ability_druid_primaltenacity',
  },
  FRENZIED_ASSAULT_SHADOWLANDS: {
    id: 340056,
    name: '狂乱攻击',
    icon: 'ability_deathwing_bloodcorruption_earth',
  },
  APEX_PREDATORS_CRAVING_BUFF_SHADOWLANDS: {
    id: 339140,
    name: '顶级捕食者的渴望',
    icon: 'ability_druid_primaltenacity',
  },
  SUDDEN_AMBUSH_BUFF_SHADOWLANDS: {
    id: 340698,
    name: '骤然突袭',
    icon: 'ability_hunter_catlikereflexes',
  },
  SHARPENED_CLAWS: {
    id: 394465,
    name: '锋利兽爪',
    icon: 'inv_misc_monsterfang_01',
  },
  SMOLDERING_FRENZY: {
    id: 422751,
    name: '阴燃狂乱',
    icon: 'inv_staff_99',
  },
  SYMBIOTIC_BLOOMS_WILDSTALKER: {
    id: 439530,
    name: '共生绽华',
    icon: 'inv_misc_lifeblood',
  },
  BLOODSEEKER_VINES: {
    id: 439531,
    name: '觅血缠藤',
    icon: 'inv_misc_herb_16',
  },
  BURSTING_GROWTH_HEAL: {
    id: 440121,
    name: '爆裂增生',
    icon: 'inv_collections_armor_flowerbracelet_b_01',
  },
  BURSTING_GROWTH_DAMAGE: {
    id: 440122,
    name: '爆裂增生',
    icon: 'inv_misc_thornnecklace',
  },
  FLOWER_WALK: {
    id: 439902,
    name: '万华疾行',
    icon: 'inv_misc_trailofflowers',
  },
  RAVAGE_DOTC_CAT: {
    id: 441591,
    name: '毁灭',
    icon: 'inv_ability_druidoftheclawdruid_ravage',
  },
  DREADFUL_WOUND: {
    id: 441812,
    name: '恐惧创痕',
    icon: 'artifactability_feraldruid_openwounds',
  },
  CENARIUS_MIGHT_BUFF: {
    id: 455801,
    name: '塞纳留斯之力',
    icon: 'achievement_reputation_guardiansofcenarius',
  },
  DREAM_BLOOM: {
    id: 434141,
    name: '梦境盛放',
    icon: 'inv_ability_keeperofthegrovedruid_dreamsurge_fiendly',
  },
} satisfies Record<string, Spell>;

export default spells;
