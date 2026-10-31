// TikTok live -> Minecraft Bedrock bot (runs in Termux on the host's phone)
// Start:   bash start.sh        (or: node bot.js [tiktok_username] [your_minecraft_name])
// In game: /wsserver localhost:19131      then   .gui   opens the settings menu
// Needs the ChatSpawnGUI addon (behavior + resource pack) enabled in the world.
//
// Optional (put before starting):  export TIKTOK_SESSIONID=...   export EULER_API_KEY=...

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const { WebSocketServer } = require('ws');
const lib = require('tiktok-live-connector');
const Conn = lib.TikTokLiveConnection || lib.WebcastPushConnection;

const CLOUD = !!process.env.PORT;                      // running on a server (Render etc.)
const WS_PORT = Number(process.env.PORT) || 19131;
const PANEL_PORT = 8080;
const SECRET = process.env.BOT_SECRET || '';             // required in the address when set
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const ts = () => new Date().toLocaleTimeString();

// ---------------- generated name lists (official Bedrock names, English + Russian) ----------------
const MOBDATA = [["allay","allay","Allay","Спешик",["аллей"]],["armadillo","armadillo","Armadillo","Броненосец",[]],["axolotl","axolotl","Axolotl","Аксолотль",[]],["bat","bat","Bat","Летучая мышь",["мышь"]],["bee","bee","Bee","Пчела",["пчелка"]],["blaze","blaze","Blaze","Ифрит",["блейз"]],["bogged","bogged","Bogged","Увязнувший",["болотный"]],["breeze","breeze","Breeze","Вихрь",["бриз"]],["camel","camel","Camel","Стрелок на верблюде",["верблюд"]],["camel_husk","camel_husk","Camel Husk","Верблюд-кадавр",["верблюд кадавр","верблюд отброс"]],["cat","cat","Cat","Кошка",["kitty","kitten","кот","котик","кошечка","киса","котэ"]],["cave_spider","cave_spider","Cave Spider","Пещерный паук",[]],["chicken","chicken","Chicken","Курица",["цыпленок","кура","курочка"]],["cod","cod","Cod","Треска",[]],["copper_golem","copper_golem","Copper Golem","Медный голем",[]],["cow","cow","Cow","Корова",["коровка"]],["creaking","creaking","Creaking","Скрипун",[]],["creeper","creeper","Creeper","Крипер",["криппер","крипэр","крипа"]],["dolphin","dolphin","Dolphin","Дельфин",[]],["donkey","donkey","Donkey","Осел",["ослик","осёл"]],["drowned","drowned","Drowned","Утопленник",["утопленник"]],["elder_guardian","elder_guardian","Elder Guardian","Древний страж",["elder guardian"]],["ender_dragon","ender_dragon","Ender Dragon","Дракон Края",["dragon","дракон","эндер дракон","эндердракон","enderdragon"]],["enderman","enderman","Enderman","Эндермен",["эндерман","эндермэн","ендермен","ender man"]],["endermite","endermite","Endermite","Обитатель Края",["эндермит"]],["evocation_illager","evocation_illager","Evoker","Вызыватель",["evoker","заклинатель"]],["fox","fox","Fox","Лиса",["лисица","лисенок"]],["frog","frog","Frog","Лягушка",[]],["ghast","ghast","Ghast","Гаст",["гаст"]],["glow_squid","glow_squid","Glow Squid","Светящийся спрут",[]],["goat","goat","Goat","Коза",["козел","козлик"]],["guardian","guardian","Guardian","Страж",["гардиан"]],["happy_ghast","happy_ghast","Happy Ghast","Счастливый гаст",["счастливый гаст"]],["hoglin","hoglin","Hoglin","Хоглин",[]],["horse","horse","Horse","Лошадь",["конь","лошадка"]],["husk","husk","Husk","Отброс",["кадавр"]],["iron_golem","iron_golem","Iron Golem","Железный голем",["голем","golem","железный голем"]],["llama","llama","Llama","Лама",[]],["magma_cube","magma_cube","Magma Cube","Лавовый куб",["магма куб","магмакуб","magma cube"]],["mooshroom","mooshroom","Mooshroom","Грибная корова",["мушрум"]],["mule","mule","Mule","Мул",[]],["nautilus","nautilus","Nautilus","Наутилус",[]],["ocelot","ocelot","Ocelot","Оцелот",[]],["panda","panda","Panda","Панда",[]],["parched","parched","Parched","Пустынник",[]],["parrot","parrot","Parrot","Попугай",[]],["phantom","phantom","Phantom","Фантом",[]],["pig","pig","Pig","Свинья",["свин","хрюша"]],["piglin","piglin","Piglin","Пиглин",[]],["piglin_brute","piglin_brute","Piglin Brute","Брутальный пиглин",["брут пиглин","пиглин брут"]],["pillager","pillager","Pillager","Разбойник",["пиллагер"]],["polar_bear","polar_bear","Polar Bear","Белый медведь",["медведь","bear"]],["pufferfish","pufferfish","Pufferfish","Рыба фугу",["фугу"]],["rabbit","rabbit","Rabbit","Кролик",["bunny","заяц","зайка"]],["ravager","ravager","Ravager","Разрушитель",["разоритель"]],["salmon","salmon","Salmon","Лосось",[]],["sheep","sheep","Sheep","Овца",["овечка"]],["shulker","shulker","Shulker","Шалкер",["шулкер"]],["silverfish","silverfish","Silverfish","Чешуйница",[]],["skeleton","skeleton","Skeleton","Скелет",["скилет"]],["skeleton_horse","skeleton_horse","Skeleton Horse","Лошадь-скелет",["лошадь скелет","скелет лошадь"]],["slime","slime","Slime","Слизень",["слайм"]],["sniffer","sniffer","Sniffer","Нюхач",[]],["snow_golem","snow_golem","Snow Golem","Снежный голем",["снеговик","snowman"]],["spider","spider","Spider","Паук",["паучок"]],["squid","squid","Squid","Спрут",["кальмар"]],["stray","stray","Stray","Бродяга",["зимогор"]],["strider","strider","Strider","Страйдер",[]],["sulfur_cube","sulfur_cube","Sulfur Cube","Серный куб",[]],["tadpole","tadpole","Tadpole","Головастик",[]],["trader_llama","trader_llama","Trader Llama","Лама торговца",[]],["tropicalfish","tropicalfish","Tropical Fish","Тропическая рыба",["tropical fish","тропическая рыба"]],["turtle","turtle","Turtle","Черепаха",[]],["vex","vex","Vex","Досаждатель",["векс"]],["villager_v2","villager_v2","Villager","Селянин",["villager","житель","крестьянин","житель деревни"]],["vindicator","vindicator","Vindicator","Поборник",["vindicator"]],["wandering_trader","wandering_trader","Wandering Trader","Бродячий торговец",["trader","торговец"]],["warden","warden","Warden","Смотритель",["варден"]],["witch","witch","Witch","Ведьма",[]],["wither","wither","Wither","Визер",["визер","иссушитель","вайзер"]],["wither_skeleton","wither_skeleton","Wither Skeleton","Визер-скелет",["скелет иссушителя","скелет визер","иссушитель скелет","визер скелет"]],["wolf","wolf","Wolf","Волк",["dog","собака","пес","собачка"]],["zoglin","zoglin","Zoglin","Зоглин",[]],["zombie","zombie","Zombie","Зомби",["зомбак"]],["zombie_horse","zombie_horse","Zombie Horse","Лошадь-зомби",["лошадь зомби","зомби лошадь"]],["zombie_nautilus","zombie_nautilus","Zombie Nautilus","Наутилус-зомби",["наутилус зомби"]],["zombie_pigman","zombie_pigman","Zombified Piglin","Зомбифицированный пиглин",["zombified piglin","zombie pigman","pigman","зомби пиглин","зомби свин","свинозомби"]],["zombie_villager_v2","zombie_villager_v2","Zombie Villager","Деревенский зомби",["зомби житель","зомби селянин"]],["lightning_bolt","lightning_bolt","Lightning Bolt","Удар молнии",["lightning","молния","lightning bolt"]],["charged_creeper","creeper","Charged Creeper","Заряженный крипер",["заряженный крипер","charged creeper"]]];      // [key, spawnId, en, ru, aliases]
const ITEMDATA = [["acacia_boat","","Лодка из акации","wood"],["acacia_button","","Кнопка из акации","redstone"],["acacia_door","","Дверь из акации","wood"],["acacia_fence","","Забор из акации","wood"],["acacia_fence_gate","","Ворота из акации","wood"],["acacia_hanging_sign","","Подвесная табличка из акации","wood"],["acacia_leaves","","Листва акации","nature"],["acacia_log","","Акациевое бревно","wood"],["acacia_planks","","Доски из акации","wood"],["acacia_pressure_plate","","Нажимная пластина из акации","redstone"],["acacia_sapling","","Саженец акации","nature"],["acacia_shelf","","Полка из акации","decor"],["acacia_sign","","Табличка из акации","wood"],["acacia_slab","","Плита из акации","wood"],["acacia_stairs","","Акациевые ступеньки","wood"],["acacia_trapdoor","","Люк из акации","wood"],["acacia_wood","","Древесина акации","wood"],["activator_rail","","Активирующие рельсы","redstone"],["allium","","Лук","nature"],["amethyst_block","Block of Amethyst","Аметистовый блок","ores"],["amethyst_cluster","","Аметистовая друза","ores"],["amethyst_shard","","Осколок аметиста","ores"],["ancient_debris","","Древние обломки","ores"],["andesite","","Андезит","stone"],["andesite_slab","","Плита из андезита","stone"],["andesite_stairs","","Андезитовые ступеньки","stone"],["andesite_wall","","Стена из андезита","stone"],["anvil","","Наковальня","decor"],["apple","","Яблоко","food"],["armadillo_scute","","Щиток броненосца","nature"],["armor_stand","","Стойка для доспехов","decor"],["arrow","","Стрела","gear"],["azalea","","Азалия","nature"],["azalea_leaves","","Листва азалии","nature"],["azalea_leaves_flowered","Flowering Azalea Leaves","Листья цветущей азалии","nature"],["azure_bluet","","Голубой василек","nature"],["baked_potato","","Печеный картофель","food"],["bamboo","","Бамбук","nature"],["bamboo_block","Block of Bamboo","Бамбуковый блок","wood"],["bamboo_button","","Бамбуковая кнопка","redstone"],["bamboo_door","","Бамбуковая дверь","wood"],["bamboo_fence","","Бамбуковый забор","wood"],["bamboo_fence_gate","","Бамбуковые ворота","wood"],["bamboo_hanging_sign","","Бамбуковая подвесная табличка","wood"],["bamboo_mosaic","","Бамбуковая мозаика","wood"],["bamboo_mosaic_slab","","Бамбуковая мозаичная плита","wood"],["bamboo_mosaic_stairs","","Ступеньки из бамбуковой мозаики","wood"],["bamboo_planks","","Бамбуковые доски","wood"],["bamboo_pressure_plate","","Бамбуковая нажимная пластина","redstone"],["bamboo_raft","","Бамбуковый плот","wood"],["bamboo_shelf","","Бамбуковая полка","nature"],["bamboo_sign","","Бамбуковая табличка","wood"],["bamboo_slab","","Бамбуковая плита","wood"],["bamboo_stairs","","Бамбуковые ступеньки","wood"],["bamboo_trapdoor","","Бамбуковый люк","wood"],["banner","","Знамя","decor"],["barrel","","Бочка","wood"],["basalt","","Базальт","nether_end"],["beacon","","Маяк","decor"],["bed","","Кровать","colored"],["bee_nest","","Дикий улей","misc"],["beef","Raw Beef","Сырая говядина","food"],["beehive","","Улей","misc"],["beetroot","","Свекла","food"],["beetroot_seeds","","Семена свеклы","nature"],["beetroot_soup","","Борщ","food"],["bell","","Колокол","decor"],["big_dripleaf","","Большой твердолист","nature"],["birch_boat","","Лодка из березы","wood"],["birch_button","","Кнопка из березы","redstone"],["birch_door","","Дверь из березы","wood"],["birch_fence","","Забор из березы","wood"],["birch_fence_gate","","Ворота из березы","wood"],["birch_hanging_sign","","Березовая подвесная табличка","wood"],["birch_leaves","","Листва березы","nature"],["birch_log","","Березовое бревно","wood"],["birch_planks","","Березовые доски","wood"],["birch_pressure_plate","","Нажимная пластина из березы","redstone"],["birch_sapling","","Саженец березы","nature"],["birch_shelf","","Полка из березы","decor"],["birch_sign","","Табличка из березы","wood"],["birch_slab","","Плита из березы","wood"],["birch_stairs","","Берёзовые ступеньки","wood"],["birch_trapdoor","","Люк из березы","wood"],["birch_wood","","Древесина березы","wood"],["black_candle","","Черная свеча","colored"],["black_carpet","","Чёрный ковёр","colored"],["black_concrete","","Черный бетон","colored"],["black_concrete_powder","","Черный цемент","colored"],["black_concrete_slab","","Чёрная бетонная плита","stone"],["black_concrete_stairs","","Чёрные бетонные ступеньки","stone"],["black_cushion","","Чёрная подушка","misc"],["black_dye","","Черный краситель","colored"],["black_glazed_terracotta","","Черная глазурованная терракота","colored"],["black_harness","","Черная упряжь","colored"],["black_shulker_box","","Черный ящик шалкера","colored"],["black_stained_glass","","Черное стекло","colored"],["black_stained_glass_pane","","Черная стеклянная панель","colored"],["black_terracotta","","Черная терракота","colored"],["black_wool","","Черная шерсть","colored"],["black_wool_slab","","Плита из чёрной шерсти","misc"],["black_wool_stairs","","Ступеньки из чёрной шерсти","misc"],["blackstone","","Чернокамень","nether_end"],["blackstone_slab","","Чернокаменная плита","nether_end"],["blackstone_stairs","","Чернитные ступеньки","nether_end"],["blackstone_wall","","Чернокаменная стена","nether_end"],["blast_furnace","","Плавильная печь","decor"],["blaze_powder","","Огненный порошок","nether_end"],["blaze_rod","","Огненный стержень","nether_end"],["blue_candle","","Синяя свеча","colored"],["blue_carpet","","Синий ковёр","colored"],["blue_concrete","","Синий бетон","colored"],["blue_concrete_powder","","Синий цемент","colored"],["blue_concrete_slab","","Синяя бетонная плита","stone"],["blue_concrete_stairs","","Синие бетонные ступеньки","stone"],["blue_cushion","","Синяя подушка","misc"],["blue_dye","","Синий краситель","colored"],["blue_egg","","Синее яйцо","nature"],["blue_glazed_terracotta","","Синяя глазурованная терракота","colored"],["blue_harness","","Синяя упряжь","colored"],["blue_ice","","Синий лед","nature"],["blue_orchid","","Синяя орхидея","nature"],["blue_shulker_box","","Синий ящик шалкера","colored"],["blue_stained_glass","","Синее стекло","colored"],["blue_stained_glass_pane","","Синяя стеклянная панель","colored"],["blue_terracotta","","Синяя терракота","colored"],["blue_wool","","Синяя шерсть","colored"],["blue_wool_slab","","Плита из синей шерсти","misc"],["blue_wool_stairs","","Ступеньки из синей шерсти","misc"],["bone","","Кость","nature"],["bone_block","","Костяной блок","nature"],["bone_meal","","Костная мука","nature"],["book","","Книга","misc"],["bookshelf","","Книжный шкаф","wood"],["bow","","Лук","gear"],["bowl","","Миска","misc"],["bread","","Хлеб","food"],["breeze_rod","","Вихревый стержень","nether_end"],["brewing_stand","","Варочная стойка","decor"],["brick","","Кирпич","stone"],["brick_block","Bricks","Кирпичи","stone"],["brick_slab","","Каменная плита","stone"],["brick_stairs","","Кирпичные ступеньки","stone"],["brick_wall","","Стена из кирпича","stone"],["brown_candle","","Коричневая свеча","colored"],["brown_carpet","","Коричневый ковёр","colored"],["brown_concrete","","Коричневый бетон","colored"],["brown_concrete_powder","","Коричневый цемент","colored"],["brown_concrete_slab","","Коричневая бетонная плита","stone"],["brown_concrete_stairs","","Коричневые бетонные ступеньки","stone"],["brown_cushion","","Коричневая подушка","misc"],["brown_dye","","Коричневый краситель","colored"],["brown_egg","","Коричневое яйцо","nature"],["brown_glazed_terracotta","","Коричневая глазурованная терракота","colored"],["brown_harness","","Коричневая упряжь","colored"],["brown_mushroom","","Коричневый гриб","nature"],["brown_mushroom_block","","Блок коричневого гриба","nature"],["brown_shulker_box","","Коричневый ящик шалкера","colored"],["brown_stained_glass","","Коричневое стекло","colored"],["brown_stained_glass_pane","","Коричневая стеклянная панель","colored"],["brown_terracotta","","Коричневая терракота","colored"],["brown_wool","","Коричневая шерсть","colored"],["brown_wool_slab","","Плита из коричневой шерсти","misc"],["brown_wool_stairs","","Ступеньки из коричневой шерсти","misc"],["brush","","Кисть","gear"],["bucket","","Ведро","misc"],["budding_amethyst","","Цветущий аметист","ores"],["bush","","Куст","nature"],["cactus","","Кактус","nature"],["cactus_flower","","Цветок кактуса","nature"],["cake","","Торт","food"],["calcite","","Кальцит","stone"],["calibrated_sculk_sensor","","Откалиброванный скалк-сенсор","redstone"],["campfire","","Костер","decor"],["candle","","Свеча","decor"],["carrot","","Морковь","food"],["carrot_on_a_stick","","Морковь на палочке","gear"],["cartography_table","","Картографический стол","wood"],["carved_pumpkin","","Вырезанная тыква","nature"],["cauldron","","Котел","decor"],["chainmail_boots","","Кольчужные ботинки","gear"],["chainmail_chestplate","","Кольчужная кираса","gear"],["chainmail_helmet","","Кольчужный шлем","gear"],["chainmail_leggings","","Кольчужные поножи","gear"],["charcoal","","Древесный уголь","ores"],["cherry_boat","","Лодка из вишни","wood"],["cherry_button","","Вишневая кнопка","redstone"],["cherry_door","","Вишневая дверь","wood"],["cherry_fence","","Вишневый забор","wood"],["cherry_fence_gate","","Вишневые ворота","wood"],["cherry_hanging_sign","","Вишневая подвесная табличка","wood"],["cherry_leaves","","Листва вишни","nature"],["cherry_log","","Бревно вишни","wood"],["cherry_planks","","Вишневые доски","wood"],["cherry_pressure_plate","","Нажимная пластина из вишни","redstone"],["cherry_sapling","","Саженец вишни","nature"],["cherry_shelf","","Вишневая полка","decor"],["cherry_sign","","Табличка из вишни","wood"],["cherry_slab","","Вишневая плита","wood"],["cherry_stairs","","Вишнёвые ступеньки","wood"],["cherry_trapdoor","","Вишневый люк","wood"],["cherry_wood","","Древесина вишни","wood"],["chest","","Сундук","wood"],["chicken","Raw Chicken","Сырая курятина","food"],["chipped_anvil","","Треснутая наковальня","decor"],["chiseled_bookshelf","","Резная книжная полка","wood"],["chiseled_cinnabar","","Резная киноварь","misc"],["chiseled_copper","","Точеная медь","ores"],["chiseled_deepslate","","Резной глубинный сланец","stone"],["chiseled_nether_bricks","","Резные незерские кирпичи","nether_end"],["chiseled_polished_blackstone","","Резной полированный чернокамень","nether_end"],["chiseled_quartz_block","","Резной кварцевый блок","ores"],["chiseled_red_sandstone","","Резной красный песчаник","stone"],["chiseled_resin_bricks","","Точеные смоляные кирпичи","ores"],["chiseled_sandstone","","Обработанный песчаник","stone"],["chiseled_stone_bricks","","Резные каменные кирпичи","stone"],["chiseled_sulfur","","Резная сера","misc"],["chiseled_tuff","","Точеный туф","stone"],["chiseled_tuff_bricks","","Точеные туфовые кирпичи","stone"],["chorus_flower","","Цветок коруса","nether_end"],["chorus_fruit","","Плод коруса","food"],["chorus_plant","","Корус","nether_end"],["cinnabar","","Киноварь","misc"],["cinnabar_brick_slab","","Плита из киноварного кирпича","stone"],["cinnabar_brick_stairs","","Ступеньки из киноварного кирпича","stone"],["cinnabar_brick_wall","","Ограда из киноварного кирпича","stone"],["cinnabar_bricks","","Киноварные кирпичи","stone"],["cinnabar_slab","","Киноварная плита","misc"],["cinnabar_stairs","","Киноварные ступеньки","misc"],["cinnabar_wall","","Киноварная ограда","stone"],["clay","","Глина","nature"],["clay_ball","","Глиняный шар","nature"],["clock","","Часы","misc"],["closed_eyeblossom","","Закрытый глазоцвет","misc"],["coal","","Уголь","ores"],["coal_block","Block of Coal","Угольный блок","ores"],["coal_ore","","Угольная руда","ores"],["coarse_dirt","","Грубая земля","nature"],["cobbled_deepslate","","Дробленый сланец","stone"],["cobbled_deepslate_slab","","Плита из дробленого сланца","stone"],["cobbled_deepslate_stairs","","Ступеньки из колотого глубинного сланца","stone"],["cobbled_deepslate_wall","","Стена из дробленого сланца","stone"],["cobblestone","","Булыжник","stone"],["cobblestone_slab","","Плита из булыжника","stone"],["cobblestone_wall","","Стена из булыжника","stone"],["cocoa_beans","","Какао-бобы","nature"],["cod","Raw Cod","Сырая треска","food"],["comparator","","Компаратор","redstone"],["compass","","Компас","misc"],["composter","","Компостер","wood"],["conduit","","Проводник","decor"],["cooked_beef","Steak","Стейк","food"],["cooked_chicken","","Жареная курятина","food"],["cooked_cod","","Жареная треска","food"],["cooked_mutton","","Жареная баранина","food"],["cooked_porkchop","","Жареная свинина","food"],["cooked_rabbit","","Жареная крольчатина","food"],["cooked_salmon","","Жареный лосось","food"],["cookie","","Печенье","food"],["copper_axe","","Медный топор","gear"],["copper_bars","","Медные прутья","ores"],["copper_block","Block of Copper","Медный блок","ores"],["copper_boots","","Медные ботинки","gear"],["copper_bulb","","Медная лампочка","redstone"],["copper_chain","","Медная цепь","ores"],["copper_chest","","Медный сундук","ores"],["copper_chestplate","","Медный нагрудник","gear"],["copper_door","","Медная дверь","ores"],["copper_golem_statue","","Статуя медного голема","ores"],["copper_grate","","Медная решетка","ores"],["copper_helmet","","Медный шлем","gear"],["copper_hoe","","Медная мотыга","gear"],["copper_horse_armor","","Медная конская броня","gear"],["copper_ingot","","Медный слиток","ores"],["copper_lantern","","Медный фонарь","ores"],["copper_leggings","","Медные поножи","gear"],["copper_nautilus_armor","","Медная броня наутилуса","ores"],["copper_nugget","","Кусочек меди","ores"],["copper_ore","","Медная руда","ores"],["copper_pickaxe","","Медная кирка","gear"],["copper_shovel","","Медная лопата","gear"],["copper_spear","","Медное копьё","ores"],["copper_sword","","Медный меч","gear"],["copper_torch","","Медный факел","ores"],["copper_trapdoor","","Медный люк","ores"],["cornflower","","Василек","nature"],["cracked_deepslate_bricks","","Потрескавшийся кирпич из глубинного сланца","stone"],["cracked_deepslate_tiles","","Потрескавшиеся плитки из глубинного сланца","stone"],["cracked_nether_bricks","","Потрескавшиеся незерские кирпичи","nether_end"],["cracked_polished_blackstone_bricks","","Потрескавшийся кирпич из полированного чернокамня","nether_end"],["cracked_stone_bricks","","Потрескавшиеся каменные кирпичи","stone"],["crafter","","Сборочный автомат","redstone"],["crafting_table","","Верстак","wood"],["creaking_heart","","Сердце скрипуна","misc"],["creeper_head","","Голова крипера","decor"],["crimson_button","","Багровая кнопка","redstone"],["crimson_door","","Багровая дверь","wood"],["crimson_fence","","Багровый забор","wood"],["crimson_fence_gate","","Багровые ворота","wood"],["crimson_fungus","","Багровый грибок","nether_end"],["crimson_hanging_sign","","Багряная подвесная табличка","wood"],["crimson_hyphae","","Багровые гифы","wood"],["crimson_nylium","","Багровый нилий","nether_end"],["crimson_planks","","Багровые доски","wood"],["crimson_pressure_plate","","Багровая нажимная пластина","redstone"],["crimson_roots","","Багровые корни","nether_end"],["crimson_shelf","","Багровая полка","nether_end"],["crimson_sign","","Багровая табличка","wood"],["crimson_slab","","Багровая плита","wood"],["crimson_stairs","","Багровые ступеньки","wood"],["crimson_stem","","Багровый стебель","wood"],["crimson_trapdoor","","Багровый люк","wood"],["crossbow","","Арбалет","gear"],["crying_obsidian","","Плачущий обсидиан","nether_end"],["cut_copper","","Резная медь","ores"],["cut_copper_slab","","Резная медная плита","ores"],["cut_copper_stairs","","Пиленые медные ступеньки","ores"],["cut_red_sandstone","","Тесаный красный песчаник","stone"],["cut_red_sandstone_slab","","Плита из тесаного красного песчаника","stone"],["cut_sandstone","","Тесаный песчаник","stone"],["cut_sandstone_slab","","Плита из тесаного песчаника","stone"],["cyan_candle","","Бирюзовая свеча","colored"],["cyan_carpet","","Бирюзовый ковёр","colored"],["cyan_concrete","","Бирюзовый бетон","colored"],["cyan_concrete_powder","","Бирюзовый цемент","colored"],["cyan_concrete_slab","","Бирюзовая бетонная плита","stone"],["cyan_concrete_stairs","","Бирюзовые бетонные ступеньки","stone"],["cyan_cushion","","Бирюзовая подушка","misc"],["cyan_dye","","Бирюзовый краситель","colored"],["cyan_glazed_terracotta","","Бирюзовая глазурованная терракота","colored"],["cyan_harness","","Бирюзовая упряжь","colored"],["cyan_shulker_box","","Бирюзовый ящик шалкера","colored"],["cyan_stained_glass","","Бирюзовое стекло","colored"],["cyan_stained_glass_pane","","Бирюзовая стеклянная панель","colored"],["cyan_terracotta","","Бирюзовая терракота","colored"],["cyan_wool","","Бирюзовая шерсть","colored"],["cyan_wool_slab","","Плита из бирюзовой шерсти","misc"],["cyan_wool_stairs","","Ступеньки из бирюзовой шерсти","misc"],["damaged_anvil","","Поврежденная наковальня","decor"],["dandelion","","Одуванчик","nature"],["dark_oak_boat","","Лодка из темного дуба","wood"],["dark_oak_button","","Кнопка из темного дуба","redstone"],["dark_oak_door","","Дверь из темного дуба","wood"],["dark_oak_fence","","Забор из темного дуба","wood"],["dark_oak_fence_gate","","Ворота из темного дуба","wood"],["dark_oak_hanging_sign","","Подвесная табличка из темного дуба","wood"],["dark_oak_leaves","","Листва темного дуба","nature"],["dark_oak_log","","Бревно темного дуба","wood"],["dark_oak_planks","","Доски из темного дуба","wood"],["dark_oak_pressure_plate","","Нажимная пластина из темного дуба","redstone"],["dark_oak_sapling","","Саженец темного дуба","nature"],["dark_oak_shelf","","Полка из темного дуба","decor"],["dark_oak_sign","","Табличка из темного дуба","wood"],["dark_oak_slab","","Плита из темного дуба","wood"],["dark_oak_stairs","","Ступеньки из тёмного дуба","wood"],["dark_oak_trapdoor","","Люк из темного дуба","wood"],["dark_oak_wood","","Древесина темного дуба","wood"],["dark_prismarine","","Темный призмарин","stone"],["dark_prismarine_slab","","Плита из темного призмарина","stone"],["dark_prismarine_stairs","","Ступеньки из тёмного призмарина","stone"],["daylight_detector","","Датчик дневного света","redstone"],["deadbush","Dead Bush","Сухой куст","nature"],["decorated_pot","","Украшенный горшок","decor"],["deepslate","","Глубинный сланец","stone"],["deepslate_brick_slab","","Плита из кирпичей из глубинного сланца","stone"],["deepslate_brick_stairs","","Ступеньки из глубинносланцевого кирпича","stone"],["deepslate_brick_wall","","Стена из кирпичей из глубинного сланца","stone"],["deepslate_bricks","","Кирпичи из глубинного сланца","stone"],["deepslate_coal_ore","","Глубинная угольная руда","ores"],["deepslate_copper_ore","","Глубинная медная руда","ores"],["deepslate_diamond_ore","","Глубинная алмазная руда","ores"],["deepslate_emerald_ore","","Глубинная изумрудная руда","ores"],["deepslate_gold_ore","","Глубинная золотая руда","ores"],["deepslate_iron_ore","","Глубинная железная руда","ores"],["deepslate_lapis_ore","Deepslate Lapis Lazuli Ore","Глубинная лазуритовая руда","ores"],["deepslate_redstone_ore","","Глубинная редстоуновая руда","redstone"],["deepslate_tile_slab","","Плита из плиток из глубинного сланца","stone"],["deepslate_tile_stairs","","Ступеньки из глубинносланцевого плитняка","stone"],["deepslate_tile_wall","","Стена из плиток из глубинного сланца","stone"],["deepslate_tiles","","Плитки из глубинного сланца","stone"],["detector_rail","","Нажимные рельсы","redstone"],["diamond","","Алмаз","ores"],["diamond_axe","","Алмазный топор","gear"],["diamond_block","Block of Diamond","Алмазный блок","ores"],["diamond_boots","","Алмазные ботинки","gear"],["diamond_chestplate","","Алмазная кираса","gear"],["diamond_helmet","","Алмазный шлем","gear"],["diamond_hoe","","Алмазная мотыга","gear"],["diamond_horse_armor","","Алмазная конская броня","gear"],["diamond_leggings","","Алмазные поножи","gear"],["diamond_nautilus_armor","","Алмазная броня наутилуса","ores"],["diamond_ore","","Алмазная руда","ores"],["diamond_pickaxe","","Алмазная кирка","gear"],["diamond_shovel","","Алмазная лопата","gear"],["diamond_spear","","Алмазное копьё","ores"],["diamond_sword","","Алмазный меч","gear"],["diorite","","Диорит","stone"],["diorite_slab","","Плита из диорита","stone"],["diorite_stairs","","Диоритовые ступеньки","stone"],["diorite_wall","","Стена из диорита","stone"],["dirt","","Земля","nature"],["dirt_with_roots","Rooted Dirt","Земля с корнями","nature"],["dispenser","","Раздатчик","redstone"],["dragon_breath","Dragon's Breath","Дыхание дракона","nether_end"],["dragon_egg","","Яйцо дракона","nether_end"],["dragon_head","","Голова дракона","nether_end"],["dried_ghast","","Высохший гаст","nether_end"],["dried_kelp","","Сушеные водоросли","food"],["dried_kelp_block","","Блок сушеных водорослей","nature"],["dripstone_block","","Блок капельника","stone"],["dropper","","Выбрасыватель","redstone"],["echo_shard","","Осколок эха","nether_end"],["egg","","Яйцо","gear"],["elytra","","Элитры","gear"],["emerald","","Изумруд","ores"],["emerald_block","Block of Emerald","Изумрудный блок","ores"],["emerald_ore","","Изумрудная руда","ores"],["enchanted_book","","Зачарованная книга","misc"],["enchanted_golden_apple","","Зачарованное золотое яблоко","food"],["enchanting_table","","Стол зачарований","decor"],["end_brick_stairs","End Stone Brick Stairs","Ступеньки из эндернякового кирпича","nether_end"],["end_bricks","End Stone Bricks","Эндерняковые кирпичи","nether_end"],["end_rod","","Стержень Энда","nether_end"],["end_stone","","Эндерняк","nether_end"],["end_stone_brick_slab","","Плита из эндернякового кирпича","nether_end"],["end_stone_brick_wall","","Стена из эндернякового кирпича","nether_end"],["ender_chest","","Эндер-сундук","nether_end"],["ender_eye","Eye of Ender","Око Эндера","nether_end"],["ender_pearl","","Эндер-жемчуг","gear"],["exposed_chiseled_copper","","Слегка окисленная точеная медь","ores"],["exposed_copper","","Слегка окисленная медь","ores"],["exposed_copper_bars","","Потемневшие медные прутья","ores"],["exposed_copper_bulb","","Слегка окисленная медная лампочка","redstone"],["exposed_copper_chain","","Слегка окисленная медная цепь","ores"],["exposed_copper_chest","","Слегка окисленный медный сундук","ores"],["exposed_copper_door","","Слегка окисленная медная дверь","ores"],["exposed_copper_golem_statue","","Слегка окисленная статуя медного голема","ores"],["exposed_copper_grate","","Слегка окисленная медная решетка","ores"],["exposed_copper_lantern","","Слегка окисленный медный фонарь","ores"],["exposed_copper_trapdoor","","Слегка окисленный медный люк","ores"],["exposed_cut_copper","","Слегка окисленная резная медь","ores"],["exposed_cut_copper_slab","","Слегка окисленная резная медная плита","ores"],["exposed_cut_copper_stairs","","Потемневшие пиленые медные ступеньки","ores"],["exposed_lightning_rod","","Слегка окисленный громоотвод","redstone"],["farmland","","Пашня","nature"],["feather","","Перо","nature"],["fence_gate","Oak Fence Gate","Ворота из дуба","misc"],["fermented_spider_eye","","Маринованный паучий глаз","misc"],["fern","","Папоротник","nature"],["fire_charge","","Огненный шар","misc"],["firefly_bush","","Куст со светлячками","nature"],["firework_rocket","","Ракета","gear"],["fishing_rod","","Удочка","gear"],["fletching_table","","Стол лучника","wood"],["flint","","Кремень","nature"],["flint_and_steel","","Огниво","gear"],["flower_pot","","Цветочный горшок","nature"],["flowering_azalea","","Цветущая азалия","nature"],["frame","Item Frame","Рамка","decor"],["frog_spawn","Frogspawn","Лягушачья икра","nature"],["frosted_ice","","Морозный лед","nature"],["furnace","","Печка","decor"],["ghast_tear","","Слеза гаста","nether_end"],["gilded_blackstone","","Позолоченный чернокамень","nether_end"],["glass","","Стекло","stone"],["glass_pane","","Стеклянная панель","stone"],["glistering_melon_slice","","Сверкающий ломтик арбуза","food"],["glow_berries","","Светящиеся ягоды","food"],["glow_frame","Glow Item Frame","Светящаяся рамка","decor"],["glow_ink_sac","","Светящийся пузырек с чернилами","nature"],["glow_lichen","","Светящийся лишайник","misc"],["glowstone","","Светокамень","nether_end"],["glowstone_dust","","Светопыль","nether_end"],["goat_horn","","Козий рог","misc"],["gold_block","Block of Gold","Золотой блок","ores"],["gold_ingot","","Золотой слиток","ores"],["gold_nugget","","Кусочек золота","ores"],["gold_ore","","Золотая руда","ores"],["golden_apple","","Золотое яблоко","food"],["golden_axe","","Золотой топор","gear"],["golden_boots","","Золотые ботинки","gear"],["golden_carrot","","Золотая морковь","food"],["golden_chestplate","","Золотая кираса","gear"],["golden_dandelion","","Золотой одуванчик","ores"],["golden_helmet","","Золотой шлем","gear"],["golden_hoe","","Золотая мотыга","gear"],["golden_horse_armor","","Золотая конская броня","gear"],["golden_leggings","","Золотые поножи","gear"],["golden_nautilus_armor","","Золотая броня наутилуса","ores"],["golden_pickaxe","","Золотая кирка","gear"],["golden_rail","Powered Rail","Электрические рельсы","redstone"],["golden_shovel","","Золотая лопата","gear"],["golden_spear","","Золотое копьё","ores"],["golden_sword","","Золотой меч","gear"],["granite","","Гранит","stone"],["granite_slab","","Плита из гранита","stone"],["granite_stairs","","Гранитные ступеньки","stone"],["granite_wall","","Стена из гранита","stone"],["grass_block","","Блок травы","nature"],["grass_path","Dirt Path","Грунтовая тропинка","nature"],["gravel","","Гравий","nature"],["gray_candle","","Серая свеча","colored"],["gray_carpet","","Серый ковёр","colored"],["gray_concrete","","Серый бетон","colored"],["gray_concrete_powder","","Серый цемент","colored"],["gray_concrete_slab","","Серая бетонная плита","stone"],["gray_concrete_stairs","","Серые бетонные ступеньки","stone"],["gray_cushion","","Серая подушка","misc"],["gray_dye","","Серый краситель","colored"],["gray_glazed_terracotta","","Серая глазурованная терракота","colored"],["gray_harness","","Серая упряжь","colored"],["gray_shulker_box","","Серый ящик шалкера","colored"],["gray_stained_glass","","Серое стекло","colored"],["gray_stained_glass_pane","","Серая стеклянная панель","colored"],["gray_terracotta","","Серая терракота","colored"],["gray_wool","","Серая шерсть","colored"],["gray_wool_slab","","Плита из серой шерсти","misc"],["gray_wool_stairs","","Ступеньки из серой шерсти","misc"],["green_candle","","Зеленая свеча","colored"],["green_carpet","","Зелёный ковёр","colored"],["green_concrete","","Зеленый бетон","colored"],["green_concrete_powder","","Зеленый цемент","colored"],["green_concrete_slab","","Зелёная бетонная плита","stone"],["green_concrete_stairs","","Зелёные бетонные ступеньки","stone"],["green_cushion","","Зелёная подушка","misc"],["green_dye","","Зеленый краситель","colored"],["green_glazed_terracotta","","Зеленая глазурованная терракота","colored"],["green_harness","","Зеленая упряжь","colored"],["green_shulker_box","","Зеленый ящик шалкера","colored"],["green_stained_glass","","Зеленое стекло","colored"],["green_stained_glass_pane","","Зеленая стеклянная панель","colored"],["green_terracotta","","Зеленая терракота","colored"],["green_wool","","Зеленая шерсть","colored"],["green_wool_slab","","Плита из зелёной шерсти","misc"],["green_wool_stairs","","Ступеньки из зелёной шерсти","misc"],["grindstone","","Точило","stone"],["gunpowder","","Порох","misc"],["hanging_roots","","Свисающие корни","nature"],["hardened_clay","Terracotta","Терракота","colored"],["hay_block","Hay Bale","Сноп сена","nature"],["heart_of_the_sea","","Сердце моря","misc"],["heavy_weighted_pressure_plate","","Утяжеленная нажимная пластина","redstone"],["honey_block","","Блок меда","redstone"],["honeycomb","","Медовые соты","nature"],["honeycomb_block","","Блок медовых сот","nature"],["hopper","","Воронка","redstone"],["ice","","Лед","nature"],["infested_chiseled_stone_bricks","Infested Chiseled Stone Brick","Зараженный резной каменный кирпич","stone"],["infested_cobblestone","","Зараженный булыжник","stone"],["infested_cracked_stone_bricks","Infested Cracked Stone Brick","Зараженный потрескавшийся каменный кирпич","stone"],["infested_deepslate","","Зараженный глубинный сланец","stone"],["infested_mossy_stone_bricks","Infested Mossy Stone Brick","Зараженный замшелый каменный кирпич","nature"],["infested_stone","","Зараженный камень","stone"],["infested_stone_bricks","","Зараженные каменные кирпичи","stone"],["ink_sac","","Пузырек с чернилами","nature"],["iron_axe","","Железный топор","gear"],["iron_bars","","Железная решетка","ores"],["iron_block","Block of Iron","Железный блок","ores"],["iron_boots","","Железные ботинки","gear"],["iron_chain","","Железная цепь","ores"],["iron_chestplate","","Железная кираса","gear"],["iron_door","","Железная дверь","ores"],["iron_helmet","","Железный шлем","gear"],["iron_hoe","","Железная мотыга","gear"],["iron_horse_armor","","Железная конская броня","gear"],["iron_ingot","","Железный слиток","ores"],["iron_leggings","","Железные поножи","gear"],["iron_nautilus_armor","","Железная броня наутилуса","ores"],["iron_nugget","","Кусочек железа","ores"],["iron_ore","","Железная руда","ores"],["iron_pickaxe","","Железная кирка","gear"],["iron_shovel","","Железная лопата","gear"],["iron_spear","","Железное копьё","ores"],["iron_sword","","Железный меч","gear"],["iron_trapdoor","","Железный люк","ores"],["jukebox","","Проигрыватель","redstone"],["jungle_boat","","Лодка из тропического дерева","wood"],["jungle_button","","Кнопка из тропического дерева","redstone"],["jungle_door","","Дверь из тропического дерева","wood"],["jungle_fence","","Забор из тропического дерева","wood"],["jungle_fence_gate","","Ворота из тропического дерева","wood"],["jungle_hanging_sign","","Подвесная табличка из тропического дерева","wood"],["jungle_leaves","","Листва тропического дерева","nature"],["jungle_log","","Бревно тропического дерева","wood"],["jungle_planks","","Доски тропического дерева","wood"],["jungle_pressure_plate","","Нажимная пластина из тропического дерева","redstone"],["jungle_sapling","","Саженец тропического дерева","nature"],["jungle_shelf","","Полка из тропического дерева","decor"],["jungle_sign","","Табличка из тропического дерева","wood"],["jungle_slab","","Плита из тропического дерева","wood"],["jungle_stairs","","Ступеньки из тропического дерева","wood"],["jungle_trapdoor","","Люк из тропического дерева","wood"],["jungle_wood","","Древесина тропического дерева","wood"],["kelp","","Водоросли","nature"],["ladder","","Лестница","wood"],["lantern","","Фонарь","decor"],["lapis_block","Block of Lapis Lazuli","Лазуритовый блок","ores"],["lapis_lazuli","","Лазурит","ores"],["lapis_ore","Lapis Lazuli Ore","Лазуритовая руда","ores"],["large_amethyst_bud","","Большой аметистовый бутон","ores"],["large_fern","","Раскидистый папоротник","nature"],["lead","","Поводок","gear"],["leaf_litter","","Подстилка из листьев","misc"],["leather","","Кожа","nature"],["leather_boots","","Кожаные ботинки","gear"],["leather_chestplate","Leather Tunic","Кожаная куртка","gear"],["leather_helmet","Leather Cap","Кожаный шлем","gear"],["leather_horse_armor","","Кожаная конская броня","gear"],["leather_leggings","Leather Pants","Кожаные поножи","gear"],["lectern","","Кафедра","wood"],["lever","","Рычаг","redstone"],["light_blue_candle","","Голубая свеча","colored"],["light_blue_carpet","","Голубой ковёр","colored"],["light_blue_concrete","","Голубой бетон","colored"],["light_blue_concrete_powder","","Голубой цемент","colored"],["light_blue_concrete_slab","","Голубая бетонная плита","stone"],["light_blue_concrete_stairs","","Голубые бетонные ступеньки","stone"],["light_blue_cushion","","Голубая подушка","misc"],["light_blue_dye","","Голубой краситель","colored"],["light_blue_glazed_terracotta","","Голубая глазурованная терракота","colored"],["light_blue_harness","","Голубая упряжь","colored"],["light_blue_shulker_box","","Голубой ящик шалкера","colored"],["light_blue_stained_glass","","Голубое стекло","colored"],["light_blue_stained_glass_pane","","Голубая стеклянная панель","colored"],["light_blue_terracotta","","Голубая терракота","colored"],["light_blue_wool","","Голубая шерсть","colored"],["light_blue_wool_slab","","Плита из голубой шерсти","misc"],["light_blue_wool_stairs","","Ступеньки из голубой шерсти","misc"],["light_gray_candle","","Светло-серая свеча","colored"],["light_gray_carpet","","Светло-серый ковёр","colored"],["light_gray_concrete","","Светло-серый бетон","colored"],["light_gray_concrete_powder","","Светло-серый цемент","colored"],["light_gray_concrete_slab","","Светло-серая бетонная плита","stone"],["light_gray_concrete_stairs","","Светло-серые бетонные ступеньки","stone"],["light_gray_cushion","","Светло-серая подушка","misc"],["light_gray_dye","","Светло-серый краситель","colored"],["light_gray_harness","","Светло-серая упряжь","colored"],["light_gray_shulker_box","","Светло-серый ящик шалкера","colored"],["light_gray_stained_glass","","Светло-серое стекло","colored"],["light_gray_stained_glass_pane","","Светло-серая стеклянная панель","colored"],["light_gray_terracotta","","Светло-серая терракота","colored"],["light_gray_wool","","Светло-серая шерсть","colored"],["light_gray_wool_slab","","Плита из светло-серой шерсти","misc"],["light_gray_wool_stairs","","Ступеньки из светло-серой шерсти","misc"],["light_weighted_pressure_plate","","Легкая нажимная пластина","redstone"],["lightning_rod","","Громоотвод","redstone"],["lilac","","Сирень","nature"],["lily_of_the_valley","","Ландыш","nature"],["lime_candle","","Лаймовая свеча","colored"],["lime_carpet","","Лаймовый ковёр","colored"],["lime_concrete","","Лаймовый бетон","colored"],["lime_concrete_powder","","Лаймовый цемент","colored"],["lime_concrete_slab","","Лаймовая бетонная плита","stone"],["lime_concrete_stairs","","Лаймовые бетонные ступеньки","stone"],["lime_cushion","","Лаймовая подушка","misc"],["lime_dye","","Лаймовый краситель","colored"],["lime_glazed_terracotta","","Лаймовая глазурованная терракота","colored"],["lime_harness","","Лаймовая упряжь","colored"],["lime_shulker_box","","Лаймовый ящик шалкера","colored"],["lime_stained_glass","","Лаймовое стекло","colored"],["lime_stained_glass_pane","","Лаймовая стеклянная панель","colored"],["lime_terracotta","","Лаймовая терракота","colored"],["lime_wool","","Лаймовая шерсть","colored"],["lime_wool_slab","","Плита из лаймовой шерсти","misc"],["lime_wool_stairs","","Ступеньки из лаймовой шерсти","misc"],["lodestone","","Магнетит","stone"],["lodestone_compass","","Магнетитовый компас","stone"],["loom","","Ткацкий станок","wood"],["mace","","Палица","gear"],["magenta_candle","","Пурпурная свеча","colored"],["magenta_carpet","","Пурпурный ковёр","colored"],["magenta_concrete","","Пурпурный бетон","colored"],["magenta_concrete_powder","","Пурпурный цемент","colored"],["magenta_concrete_slab","","Пурпурная бетонная плита","stone"],["magenta_concrete_stairs","","Пурпурные бетонные ступеньки","stone"],["magenta_cushion","","Пурпурная подушка","misc"],["magenta_dye","","Пурпурный краситель","colored"],["magenta_glazed_terracotta","","Пурпурная глазурованная терракота","colored"],["magenta_harness","","Пурпурная упряжь","colored"],["magenta_shulker_box","","Пурпурный ящик шалкера","colored"],["magenta_stained_glass","","Пурпурное стекло","colored"],["magenta_stained_glass_pane","","Пурпурная стеклянная панель","colored"],["magenta_terracotta","","Пурпурная терракота","colored"],["magenta_wool","","Пурпурная шерсть","colored"],["magenta_wool_slab","","Плита из пурпурной шерсти","misc"],["magenta_wool_stairs","","Ступеньки из пурпурной шерсти","misc"],["magma","Magma Block","Блок магмы","nether_end"],["magma_cream","","Сгусток магмы","nether_end"],["mangrove_boat","","Мангровая лодка","wood"],["mangrove_button","","Мангровая кнопка","redstone"],["mangrove_door","","Мангровая дверь","wood"],["mangrove_fence","","Мангровый забор","wood"],["mangrove_fence_gate","","Мангровые ворота","wood"],["mangrove_hanging_sign","","Подвесная мангровая табличка","wood"],["mangrove_leaves","","Листва мангровых зарослей","nature"],["mangrove_log","","Мангровое бревно","wood"],["mangrove_planks","","Мангровые доски","wood"],["mangrove_pressure_plate","","Мангровая нажимная пластина","redstone"],["mangrove_propagule","","Мангровый росток","misc"],["mangrove_roots","","Мангровые корни","nature"],["mangrove_shelf","","Мангровая полка","decor"],["mangrove_sign","","Мангровая табличка","wood"],["mangrove_slab","","Мангровая плита","wood"],["mangrove_stairs","","Мангровые ступеньки","wood"],["mangrove_trapdoor","","Мангровый люк","wood"],["mangrove_wood","","Мангровая древесина","wood"],["medium_amethyst_bud","","Средний аметистовый бутон","ores"],["melon_block","Melon","Арбуз","nature"],["melon_seeds","","Семена арбуза","nature"],["melon_slice","","Ломтик арбуза","food"],["moss_block","","Блок мха","nature"],["moss_carpet","","Ковёр из мха","nature"],["mossy_cobblestone","","Замшелый булыжник","nature"],["mossy_cobblestone_slab","","Плита из замшелого булыжника","nature"],["mossy_cobblestone_stairs","","Замшелые булыжные ступеньки","nature"],["mossy_cobblestone_wall","","Стена из замшелого булыжника","nature"],["mossy_stone_brick_slab","","Плита из замшелого каменного кирпича","nature"],["mossy_stone_brick_stairs","","Ступеньки из замшелого каменного кирпича","nature"],["mossy_stone_brick_wall","","Стена из замшелого каменного кирпича","nature"],["mossy_stone_bricks","","Замшелые каменные кирпичи","nature"],["mud","","Грязь","nature"],["mud_brick_slab","","Плита из глинобитного кирпича","nature"],["mud_brick_stairs","","Саманные ступеньки","nature"],["mud_brick_wall","","Стена из глинобитного кирпича","nature"],["mud_bricks","","Глинобитные кирпичи","nature"],["muddy_mangrove_roots","","Грязные мангровые корни","nature"],["mushroom_stem","","Грибной стебель","wood"],["mushroom_stew","","Тушеные грибы","food"],["mutton","Raw Mutton","Сырая баранина","food"],["mycelium","","Мицелий","nature"],["name_tag","","Бирка","gear"],["nautilus_shell","","Раковина наутилуса","nature"],["nether_brick","Nether Bricks","Кирпич Нижнего мира","nether_end"],["nether_brick_fence","","Незерский забор","nether_end"],["nether_brick_slab","","Незерская плита","nether_end"],["nether_brick_stairs","","Ступеньки из незерского кирпича","nether_end"],["nether_brick_wall","","Стена из незерского кирпича","nether_end"],["nether_gold_ore","","Незерская золотая руда","ores"],["nether_sprouts","","Незерские ростки","nether_end"],["nether_star","","Звезда Незера","nether_end"],["nether_wart","","Незерский нарост","nether_end"],["nether_wart_block","","Блок незерского нароста","nether_end"],["netherbrick","Nether Brick","Незерский кирпич","nether_end"],["netherite_axe","","Незеритовый топор","gear"],["netherite_block","Block of Netherite","Блок незерита","ores"],["netherite_boots","","Незеритовые ботинки","gear"],["netherite_chestplate","","Незеритовая кираса","gear"],["netherite_helmet","","Незеритовый шлем","gear"],["netherite_hoe","","Незеритовая мотыга","gear"],["netherite_horse_armor","","Незеритовая конская броня","gear"],["netherite_ingot","","Незеритовый слиток","ores"],["netherite_leggings","","Незеритовые поножи","gear"],["netherite_nautilus_armor","","Незеритовая броня наутилуса","ores"],["netherite_pickaxe","","Незеритовая кирка","gear"],["netherite_scrap","","Незеритовый скрап","ores"],["netherite_shovel","","Незеритовая лопата","gear"],["netherite_spear","","Незеритовое копьё","ores"],["netherite_sword","","Незеритовый меч","gear"],["netherrack","","Незерак","nether_end"],["normal_stone_slab","Stone Slab","Плита из камня","stone"],["normal_stone_stairs","Stone Stairs","Каменные ступеньки","stone"],["noteblock","Note Block","Музыкальный блок","redstone"],["oak_boat","","Лодка из дуба","wood"],["oak_fence","","Забор из дуба","wood"],["oak_hanging_sign","","Подвесная табличка из дуба","wood"],["oak_leaves","","Листва дуба","nature"],["oak_log","","Дубовое бревно","wood"],["oak_planks","","Дубовые доски","wood"],["oak_sapling","","Саженец дуба","nature"],["oak_shelf","","Полка из дуба","decor"],["oak_sign","","Табличка из дуба","wood"],["oak_slab","","Плита из дуба","wood"],["oak_stairs","","Дубовые ступеньки","wood"],["oak_wood","","Древесина дуба","wood"],["observer","","Наблюдатель","redstone"],["obsidian","","Обсидиан","nether_end"],["ochre_froglight","","Охристая квампа","nature"],["open_eyeblossom","","Открытый глазоцвет","misc"],["orange_candle","","Оранжевая свеча","colored"],["orange_carpet","","Оранжевый ковёр","colored"],["orange_concrete","","Оранжевый бетон","colored"],["orange_concrete_powder","","Оранжевый цемент","colored"],["orange_concrete_slab","","Оранжевая бетонная плита","stone"],["orange_concrete_stairs","","Оранжевые бетонные ступеньки","stone"],["orange_cushion","","Оранжевая подушка","misc"],["orange_dye","","Оранжевый краситель","colored"],["orange_glazed_terracotta","","Оранжевая глазурованная терракота","colored"],["orange_harness","","Оранжевая упряжь","colored"],["orange_poplar_leaves","","Оранжевая листва тополя","nature"],["orange_shulker_box","","Оранжевый ящик шалкера","colored"],["orange_stained_glass","","Оранжевое стекло","colored"],["orange_stained_glass_pane","","Оранжевая стеклянная панель","colored"],["orange_terracotta","","Оранжевая терракота","colored"],["orange_tulip","","Оранжевый тюльпан","nature"],["orange_wool","","Оранжевая шерсть","colored"],["orange_wool_slab","","Плита из оранжевой шерсти","misc"],["orange_wool_stairs","","Ступеньки из оранжевой шерсти","misc"],["oxeye_daisy","","Ромашка","misc"],["oxidized_chiseled_copper","","Окисленная точеная медь","ores"],["oxidized_copper","","Окисленная медь","ores"],["oxidized_copper_bars","","Окисленные медные прутья","ores"],["oxidized_copper_bulb","","Окисленная медная лампочка","redstone"],["oxidized_copper_chain","","Окисленная медная цепь","ores"],["oxidized_copper_chest","","Окисленный медный сундук","ores"],["oxidized_copper_door","","Окисленная медная дверь","ores"],["oxidized_copper_golem_statue","","Окисленная статуя медного голема","ores"],["oxidized_copper_grate","","Окисленная медная решетка","ores"],["oxidized_copper_lantern","","Окисленный медный фонарь","ores"],["oxidized_copper_trapdoor","","Окисленный медный люк","ores"],["oxidized_cut_copper","","Окисленная резная медь","ores"],["oxidized_cut_copper_slab","","Окисленная резная медная плита","ores"],["oxidized_cut_copper_stairs","","Окисленные пиленые медные ступеньки","ores"],["oxidized_lightning_rod","","Окисленный громоотвод","redstone"],["packed_ice","","Плотный лед","nature"],["packed_mud","","Утрамбованная грязь","nature"],["painting","","Картина","decor"],["pale_hanging_moss","","Свисающий бледный мох","nature"],["pale_moss_block","","Блок бледного мха","nature"],["pale_moss_carpet","","Ковёр из бледного мха","nature"],["pale_oak_boat","","Лодка из бледного дуба","wood"],["pale_oak_button","","Кнопка из бледного дуба","redstone"],["pale_oak_door","","Дверь из бледного дуба","wood"],["pale_oak_fence","","Забор из бледного дуба","wood"],["pale_oak_fence_gate","","Ворота из бледного дуба","wood"],["pale_oak_hanging_sign","","Подвесная табличка из бледного дуба","wood"],["pale_oak_leaves","","Листва бледного дуба","nature"],["pale_oak_log","","Бревно бледного дуба","wood"],["pale_oak_planks","","Доски из бледного дуба","wood"],["pale_oak_pressure_plate","","Нажимная пластина из бледного дуба","redstone"],["pale_oak_sapling","","Саженец бледного дуба","nature"],["pale_oak_shelf","","Полка из светлого дуба","decor"],["pale_oak_sign","","Табличка из бледного дуба","wood"],["pale_oak_slab","","Плита из бледного дуба","wood"],["pale_oak_stairs","","Ступеньки из бледного дуба","wood"],["pale_oak_trapdoor","","Люк из бледного дуба","wood"],["pale_oak_wood","","Древесина бледного дуба","wood"],["paper","","Бумага","misc"],["pearlescent_froglight","","Перламутровая квампа","nature"],["peony","","Пион","nature"],["phantom_membrane","","Мембрана фантома","misc"],["piglin_head","","Голова пиглина","decor"],["pink_candle","","Розовая свеча","colored"],["pink_carpet","","Розовый ковёр","colored"],["pink_concrete","","Розовый бетон","colored"],["pink_concrete_powder","","Розовый цемент","colored"],["pink_concrete_slab","","Розовая бетонная плита","stone"],["pink_concrete_stairs","","Розовые бетонные ступеньки","stone"],["pink_cushion","","Розовая подушка","misc"],["pink_dye","","Розовый краситель","colored"],["pink_glazed_terracotta","","Розовая глазурованная терракота","colored"],["pink_harness","","Розовая упряжь","colored"],["pink_petals","","Розовые лепестки","nature"],["pink_shulker_box","","Розовый ящик шалкера","colored"],["pink_stained_glass","","Розовое стекло","colored"],["pink_stained_glass_pane","","Розовая стеклянная панель","colored"],["pink_terracotta","","Розовая терракота","colored"],["pink_tulip","","Розовый тюльпан","nature"],["pink_wool","","Розовая шерсть","colored"],["pink_wool_slab","","Плита из розовой шерсти","misc"],["pink_wool_stairs","","Ступеньки из розовой шерсти","misc"],["piston","","Поршень","redstone"],["pitcher_plant","","Кувшинник","misc"],["pitcher_pod","","Стручок кувшинника","misc"],["player_head","","Голова игрока","decor"],["podzol","","Подзол","nature"],["pointed_dripstone","","Капельник","stone"],["poisonous_potato","","Ядовитый картофель","food"],["polished_andesite","","Полированный андезит","stone"],["polished_andesite_slab","","Плита из полированного андезита","stone"],["polished_andesite_stairs","","Ступеньки из полированного андезита","stone"],["polished_basalt","","Полированный базальт","nether_end"],["polished_blackstone","","Полированный чернокамень","nether_end"],["polished_blackstone_brick_slab","","Кирпичная плита из полированного чернокамня","nether_end"],["polished_blackstone_brick_stairs","","Ступеньки из полированно-чернитного кирпича","nether_end"],["polished_blackstone_brick_wall","","Стена из кирпича из полированного чернокамня","nether_end"],["polished_blackstone_bricks","","Кирпич из полированного чернокамня","nether_end"],["polished_blackstone_button","","Кнопка из полированного чернокамня","redstone"],["polished_blackstone_pressure_plate","","Нажимная пластина из полированного чернокамня","redstone"],["polished_blackstone_slab","","Плита из полированного чернокамня","nether_end"],["polished_blackstone_stairs","","Ступеньки из полированного чернита","nether_end"],["polished_blackstone_wall","","Стена из полированного чернокамня","nether_end"],["polished_cinnabar","","Полированная киноварь","stone"],["polished_cinnabar_slab","","Плита из полированной киновари","stone"],["polished_cinnabar_stairs","","Ступеньки из полированной киновари","stone"],["polished_cinnabar_wall","","Ограда из полированной киновари","stone"],["polished_deepslate","","Полированный глубинный сланец","stone"],["polished_deepslate_slab","","Полированная плита из глубинного сланца","stone"],["polished_deepslate_stairs","","Ступеньки из полированного глубинного сланца","stone"],["polished_deepslate_wall","","Полированная стена из глубинного сланца","stone"],["polished_diorite","","Полированный диорит","stone"],["polished_diorite_slab","","Плита из полированного диорита","stone"],["polished_diorite_stairs","","Ступеньки из полированного диорита","stone"],["polished_granite","","Полированный гранит","stone"],["polished_granite_slab","","Плита из полированного гранита","stone"],["polished_granite_stairs","","Ступеньки из полированного гранита","stone"],["polished_sulfur","","Полированная сера","stone"],["polished_sulfur_slab","","Плита из полированной серы","stone"],["polished_sulfur_stairs","","Ступеньки из полированной серы","stone"],["polished_sulfur_wall","","Ограда из полированной серы","stone"],["polished_tuff","","Полированный туф","stone"],["polished_tuff_slab","","Плита из полированного туфа","stone"],["polished_tuff_stairs","","Ступеньки из полированного туфа","stone"],["polished_tuff_wall","","Стена из полированного туфа","stone"],["poplar_boat","","Лодка из тополя","misc"],["poplar_button","","Кнопка из тополя","redstone"],["poplar_door","","Дверь из тополя","misc"],["poplar_fence","","Забор из тополя","misc"],["poplar_fence_gate","","Калитка из тополя","misc"],["poplar_hanging_sign","","Подвесная табличка из тополя","decor"],["poplar_log","","Бревно тополя","wood"],["poplar_planks","","Доски из тополя","wood"],["poplar_pressure_plate","","Нажимная пластина из тополя","redstone"],["poplar_sapling","","Саженец тополя","nature"],["poplar_shelf","","Полка из тополя","decor"],["poplar_sign","","Табличка из тополя","decor"],["poplar_slab","","Плита из тополя","misc"],["poplar_stairs","","Ступеньки из тополя","misc"],["poplar_trapdoor","","Люк из тополя","misc"],["poplar_wood","","Древесина тополя","wood"],["popped_chorus_fruit","","Приготовленный плод коруса","nether_end"],["poppy","","Мак","nature"],["porkchop","Raw Porkchop","Сырая свинина","food"],["potato","","Картофель","food"],["potent_sulfur","","Активная сера","decor"],["prismarine","","Призмарин","stone"],["prismarine_brick_slab","","Плита из призмариновых кирпичей","stone"],["prismarine_bricks","","Призмариновые кирпичи","stone"],["prismarine_bricks_stairs","Prismarine Brick Stairs","Ступеньки из призмаринового кирпича","stone"],["prismarine_crystals","","Кристаллы призмарина","nature"],["prismarine_shard","","Осколок призмарина","nature"],["prismarine_slab","","Призмариновая плита","stone"],["prismarine_stairs","","Призмариновые ступеньки","stone"],["prismarine_wall","","Призмариновая стена","stone"],["pufferfish","","Рыба фугу","food"],["pumpkin","","Тыква","nature"],["pumpkin_pie","","Тыквенный пирог","food"],["pumpkin_seeds","","Семена тыквы","nature"],["purple_candle","","Фиолетовая свеча","colored"],["purple_carpet","","Фиолетовый ковёр","colored"],["purple_concrete","","Фиолетовый бетон","colored"],["purple_concrete_powder","","Фиолетовый цемент","colored"],["purple_concrete_slab","","Фиолетовая бетонная плита","stone"],["purple_concrete_stairs","","Фиолетовые бетонные ступеньки","stone"],["purple_cushion","","Фиолетовая подушка","misc"],["purple_dye","","Фиолетовый краситель","colored"],["purple_glazed_terracotta","","Фиолетовая глазурованная терракота","colored"],["purple_harness","","Фиолетовая упряжь","colored"],["purple_shulker_box","","Фиолетовый ящик шалкера","colored"],["purple_stained_glass","","Фиолетовое стекло","colored"],["purple_stained_glass_pane","","Фиолетовая стеклянная панель","colored"],["purple_terracotta","","Фиолетовая терракота","colored"],["purple_wool","","Фиолетовая шерсть","colored"],["purple_wool_slab","","Плита из фиолетовой шерсти","misc"],["purple_wool_stairs","","Ступеньки из фиолетовой шерсти","misc"],["purpur_block","","Пурпурный блок","nether_end"],["purpur_pillar","","Пурпурная колонна","nether_end"],["purpur_slab","","Пурпурная плита","nether_end"],["purpur_stairs","","Пурпуровые ступеньки","nether_end"],["quartz","Nether Quartz","Незерский кварц","ores"],["quartz_block","Block of Quartz","Кварцевый блок","ores"],["quartz_bricks","","Кварцевый кирпич","ores"],["quartz_ore","Nether Quartz Ore","Руда незерского кварца","ores"],["quartz_pillar","","Кварцевая колонна","ores"],["quartz_slab","","Кварцевая плита","ores"],["quartz_stairs","","Кварцевые ступеньки","ores"],["rabbit","Raw Rabbit","Сырая крольчатина","food"],["rabbit_foot","Rabbit's Foot","Кроличья лапка","misc"],["rabbit_hide","","Кроличья шкурка","nature"],["rabbit_stew","","Тушеный кролик","food"],["rail","","Рельсы","redstone"],["raw_copper","","Необработанная медь","ores"],["raw_copper_block","Block of Raw Copper","Блок необработанной меди","ores"],["raw_gold","","Необработанное золото","ores"],["raw_gold_block","Block of Raw Gold","Блок необработанного золота","ores"],["raw_iron","","Необработанное железо","ores"],["raw_iron_block","Block of Raw Iron","Блок необработанного железа","ores"],["recovery_compass","","Компас восстановления","misc"],["red_candle","","Красная свеча","colored"],["red_carpet","","Красный ковёр","colored"],["red_concrete","","Красный бетон","colored"],["red_concrete_powder","","Красный цемент","colored"],["red_concrete_slab","","Красная бетонная плита","stone"],["red_concrete_stairs","","Красные бетонные ступеньки","stone"],["red_cushion","","Красная подушка","misc"],["red_dye","","Красный краситель","colored"],["red_glazed_terracotta","","Красная глазурованная терракота","colored"],["red_harness","","Красная упряжь","colored"],["red_mushroom","","Красный гриб","nature"],["red_mushroom_block","","Блок красного гриба","nature"],["red_nether_brick","Red Nether Bricks","Красный кирпич Нижнего мира","nether_end"],["red_nether_brick_slab","","Плита из красного незерского кирпича","nether_end"],["red_nether_brick_stairs","","Ступеньки из красного незерского кирпича","nether_end"],["red_nether_brick_wall","","Стена из красного незерского кирпича","nether_end"],["red_poplar_leaves","","Красная листва тополя","nature"],["red_sand","","Красный песок","nature"],["red_sandstone","","Красный песчаник","stone"],["red_sandstone_slab","","Плита из красного песчаника","stone"],["red_sandstone_stairs","","Ступеньки из красного песчаника","stone"],["red_sandstone_wall","","Стена из красного песчаника","stone"],["red_shrub","","Красный куст","misc"],["red_shulker_box","","Красный ящик шалкера","colored"],["red_stained_glass","","Красное стекло","colored"],["red_stained_glass_pane","","Красная стеклянная панель","colored"],["red_terracotta","","Красная терракота","colored"],["red_tulip","","Красный тюльпан","nature"],["red_wool","","Красная шерсть","colored"],["red_wool_slab","","Плита из красной шерсти","misc"],["red_wool_stairs","","Ступеньки из красной шерсти","misc"],["redstone","Redstone Dust","Редстоуновая пыль","redstone"],["redstone_block","Block of Redstone","Редстоуновый блок","redstone"],["redstone_lamp","","Редстоуновый фонарь","redstone"],["redstone_ore","","Редстоуновая руда","redstone"],["redstone_torch","","Редстоуновый факел","redstone"],["repeater","Redstone Repeater","Редстоуновый повторитель","redstone"],["resin_block","Block of Resin","Смоляной блок","ores"],["resin_brick","","Смоляной кирпич","ores"],["resin_brick_slab","","Плита из смоляного кирпича","ores"],["resin_brick_stairs","","Ступеньки из смоляного кирпича","ores"],["resin_brick_wall","","Стена из смоляного кирпича","ores"],["resin_bricks","","Смоляные кирпичи","ores"],["resin_clump","","Комок смолы","ores"],["respawn_anchor","","Якорь возрождения","decor"],["rose_bush","","Розовый куст","nature"],["rotten_flesh","","Гнилая плоть","food"],["saddle","","Седло","gear"],["salmon","Raw Salmon","Сырой лосось","food"],["sand","","Песок","nature"],["sandstone","","Песчаник","stone"],["sandstone_slab","","Плита из песчаника","stone"],["sandstone_stairs","","Песчаниковые ступеньки","stone"],["sandstone_wall","","Стена из песчаника","stone"],["scaffolding","","Строительные леса","decor"],["sculk","","Скалк","nether_end"],["sculk_catalyst","","Скалковый катализатор","nether_end"],["sculk_sensor","","Скалк-сенсор","redstone"],["sculk_shrieker","","Скалковый крикун","nether_end"],["sculk_vein","","Скалковая жила","nether_end"],["sea_lantern","","Морской фонарь","decor"],["sea_pickle","","Морской огурец","nature"],["seagrass","","Морская трава","nature"],["shears","","Ножницы","gear"],["shelf_mushroom","","Трутовый гриб","nature"],["shield","","Щит","gear"],["short_dry_grass","","Короткая сухая трава","nature"],["short_grass","","Короткая трава","nature"],["shroomlight","","Грибосвет","nether_end"],["shulker_shell","","Панцирь шалкера","nether_end"],["silver_glazed_terracotta","Light Gray Glazed Terracotta","Светло-серая глазурованная терракота","stone"],["skeleton_skull","","Череп скелета","decor"],["slime","Slime Block","Блок слизи","redstone"],["slime_ball","Slimeball","Слизь","misc"],["small_amethyst_bud","","Малый аметистовый бутон","ores"],["small_dripleaf_block","Small Dripleaf","Маленький твердолист","nature"],["smithing_table","","Кузнечный станок","wood"],["smoker","","Коптильня","decor"],["smooth_basalt","","Гладкий базальт","nether_end"],["smooth_quartz","Smooth Quartz Block","Гладкий кварцевый блок","ores"],["smooth_quartz_slab","","Плита из гладкого кварца","ores"],["smooth_quartz_stairs","","Ступеньки из гладкого кварца","ores"],["smooth_red_sandstone","","Гладкий красный песчаник","stone"],["smooth_red_sandstone_slab","","Плита из гладкого красного песчаника","stone"],["smooth_red_sandstone_stairs","","Ступеньки из гладкого красного песчаника","stone"],["smooth_sandstone","","Гладкий песчаник","stone"],["smooth_sandstone_slab","","Плита из гладкого песчаника","stone"],["smooth_sandstone_stairs","","Ступеньки из гладкого песчаника","stone"],["smooth_stone","","Гладкий камень","stone"],["smooth_stone_slab","","Плита из гладкого камня","stone"],["sniffer_egg","","Яйцо нюхача","nature"],["snow","Snow Block","Блок снега","nature"],["snow_layer","Snow","Снег","nature"],["snowball","","Снежок","gear"],["soul_campfire","","Костер с огнем душ","nether_end"],["soul_lantern","","Фонарь с огнем душ","nether_end"],["soul_sand","","Песок душ","nether_end"],["soul_soil","","Почва душ","nether_end"],["soul_torch","","Факел с огнем душ","nether_end"],["spider_eye","","Паучий глаз","food"],["sponge","","Губка","nature"],["spore_blossom","","Спороцвет","nature"],["spruce_boat","","Еловая лодка","wood"],["spruce_button","","Еловая кнопка","redstone"],["spruce_door","","Еловая дверь","wood"],["spruce_fence","","Еловый забор","wood"],["spruce_fence_gate","","Еловые ворота","wood"],["spruce_hanging_sign","","Еловая подвесная табличка","wood"],["spruce_leaves","","Хвоя","nature"],["spruce_log","","Еловое бревно","wood"],["spruce_planks","","Еловые доски","wood"],["spruce_pressure_plate","","Еловая нажимная пластина","redstone"],["spruce_sapling","","Саженец ели","nature"],["spruce_shelf","","Еловая полка","decor"],["spruce_sign","","Еловая табличка","wood"],["spruce_slab","","Еловая плита","wood"],["spruce_stairs","","Еловые ступеньки","wood"],["spruce_trapdoor","","Еловый люк","wood"],["spruce_wood","","Древесина ели","wood"],["spyglass","","Подзорная труба","gear"],["stick","","Палка","wood"],["sticky_piston","","Липкий поршень","redstone"],["stone","","Камень","stone"],["stone_axe","","Каменный топор","gear"],["stone_brick_slab","","Плита из каменных кирпичей","stone"],["stone_brick_stairs","","Ступеньки из каменного кирпича","stone"],["stone_brick_wall","","Стена из каменного кирпича","stone"],["stone_bricks","","Каменные кирпичи","stone"],["stone_button","","Каменная кнопка","redstone"],["stone_hoe","","Каменная мотыга","gear"],["stone_pickaxe","","Каменная кирка","gear"],["stone_pressure_plate","","Каменная нажимная пластина","redstone"],["stone_shovel","","Каменная лопата","gear"],["stone_spear","","Каменное копьё","stone"],["stone_stairs","Cobblestone Stairs","Булыжные ступеньки","stone"],["stone_sword","","Каменный меч","gear"],["stonecutter_block","Stonecutter","Камнетес","stone"],["straw_bed","","Соломенная кровать","ores"],["string","","Нить","nature"],["stripped_acacia_log","","Ошкуренное акациевое бревно","wood"],["stripped_acacia_wood","","Ошкуренная древесина акации","wood"],["stripped_bamboo_block","Block of Stripped Bamboo","Полосатый бамбуковый блок","wood"],["stripped_birch_log","","Ошкуренное березовое бревно","wood"],["stripped_birch_wood","","Ошкуренная древесина березы","wood"],["stripped_cherry_log","","Ошкуренное вишневое бревно","wood"],["stripped_cherry_wood","","Ошкуренная древесина вишни","wood"],["stripped_crimson_hyphae","","Полосатые багровые гифы","wood"],["stripped_crimson_stem","","Обтесанный багровый стебель","wood"],["stripped_dark_oak_log","","Ошкуренное бревно темного дуба","wood"],["stripped_dark_oak_wood","","Ошкуренная древесина темного дуба","wood"],["stripped_jungle_log","","Ошкуренное бревно тропического дерева","wood"],["stripped_jungle_wood","","Ошкуренная древесина тропического дерева","wood"],["stripped_mangrove_log","","Очищенное мангровое бревно","wood"],["stripped_mangrove_wood","","Очищенная мангровая древесина","wood"],["stripped_oak_log","","Ошкуренное дубовое бревно","wood"],["stripped_oak_wood","","Ошкуренная древесина дуба","wood"],["stripped_pale_oak_log","","Ошкуренное бревно бледного дуба","wood"],["stripped_pale_oak_wood","","Ошкуренная древесина бледного дуба","wood"],["stripped_poplar_log","","Ошкуренное бревно тополя","wood"],["stripped_poplar_wood","","Ошкуренная древесина тополя","wood"],["stripped_spruce_log","","Ошкуренное еловое бревно","wood"],["stripped_spruce_wood","","Ошкуренная древесина ели","wood"],["stripped_warped_hyphae","","Полосатые искаженные гифы","wood"],["stripped_warped_stem","","Обтесанный искаженный стебель","wood"],["sugar","","Сахар","misc"],["sugar_cane","","Сахарный тростник","nature"],["sulfur","","Сера","misc"],["sulfur_brick_slab","","Плита из серного кирпича","stone"],["sulfur_brick_stairs","","Ступеньки из серного кирпича","stone"],["sulfur_brick_wall","","Ограда из серного кирпича","stone"],["sulfur_bricks","","Серные кирпичи","stone"],["sulfur_slab","","Серная плита","misc"],["sulfur_spike","","Серный шип","misc"],["sulfur_stairs","","Серные ступеньки","misc"],["sulfur_wall","","Серная ограда","stone"],["sunflower","","Подсолнух","nature"],["suspicious_gravel","","Подозрительный гравий","nature"],["suspicious_sand","","Подозрительный песок","nature"],["suspicious_stew","","Подозрительное рагу","food"],["sweet_berries","","Сладкие ягоды","food"],["tall_dry_grass","","Высокая сухая трава","nature"],["tall_grass","","Высокая трава","nature"],["target","","Мишень","redstone"],["tinted_glass","","Тонированное стекло","stone"],["tnt","","Динамит","redstone"],["torch","","Факел","decor"],["torchflower","","Факельник","nature"],["torchflower_seeds","","Семена факельников","nature"],["totem_of_undying","","Тотем бессмертия","gear"],["trapdoor","Oak Trapdoor","Люк из дуба","misc"],["trapped_chest","","Сундук-ловушка","redstone"],["trident","","Трезубец","gear"],["tripwire_hook","","Натяжной датчик","redstone"],["tropical_fish","","Тропическая рыба","food"],["tuff","","Туф","stone"],["tuff_brick_slab","","Плита из туфовых кирпичей","stone"],["tuff_brick_stairs","","Ступеньки из туфового кирпича","stone"],["tuff_brick_wall","","Стена из туфового кирпича","stone"],["tuff_bricks","","Кирпич из туфа","stone"],["tuff_slab","","Туфовая плита","stone"],["tuff_stairs","","Туфовые ступеньки","stone"],["tuff_wall","","Стена из туфа","stone"],["turtle_egg","","Яйцо черепахи","nature"],["turtle_helmet","Turtle Shell","Панцирь черепахи","gear"],["turtle_scute","","Щиток черепахи","nature"],["twisting_vines","","Извилистая лоза","nature"],["undyed_shulker_box","Shulker Box","Ящик шалкера","colored"],["verdant_froglight","","Малахитовая квампа","nature"],["vine","Vines","Лоза","nature"],["warped_button","","Искаженная кнопка","redstone"],["warped_door","","Искаженная дверь","wood"],["warped_fence","","Искаженный забор","wood"],["warped_fence_gate","","Искаженные ворота","wood"],["warped_fungus","","Искаженный грибок","nether_end"],["warped_fungus_on_a_stick","","Искаженный грибок на палке","gear"],["warped_hanging_sign","","Искаженная подвесная табличка","wood"],["warped_hyphae","","Искаженные гифы","wood"],["warped_nylium","","Искаженный нилий","nether_end"],["warped_planks","","Искаженные доски","wood"],["warped_pressure_plate","","Искаженная нажимная пластина","redstone"],["warped_roots","","Искаженные корни","nether_end"],["warped_shelf","","Искаженная полка","nether_end"],["warped_sign","","Искаженная табличка","wood"],["warped_slab","","Искаженная плита","wood"],["warped_stairs","","Искажённые ступеньки","wood"],["warped_stem","","Искаженный стебель","wood"],["warped_trapdoor","","Искаженный люк","wood"],["warped_wart_block","","Блок искаженного нароста","nether_end"],["waterlily","Lily Pad","Кувшинка","nature"],["waxed_chiseled_copper","","Вощеная точеная медь","ores"],["waxed_copper","Waxed Block of Copper","Вощеный медный блок","ores"],["waxed_copper_bars","","Вощёные медные прутья","ores"],["waxed_copper_bulb","","Вощеная медная лампочка","redstone"],["waxed_copper_chain","","Вощеная медная цепь","ores"],["waxed_copper_chest","","Вощеный медный сундук","ores"],["waxed_copper_door","","Вощеная медная дверь","ores"],["waxed_copper_golem_statue","","Вощеная статуя медного голема","ores"],["waxed_copper_grate","","Вощеная медная решетка","ores"],["waxed_copper_lantern","","Вощеный медный фонарь","ores"],["waxed_copper_trapdoor","","Вощеный медный люк","ores"],["waxed_cut_copper","","Вощеная резная медь","ores"],["waxed_cut_copper_slab","","Вощеная резная медная плита","ores"],["waxed_cut_copper_stairs","","Вощёные пиленые медные ступеньки","ores"],["waxed_exposed_chiseled_copper","","Вощеная слегка окисленная точеная медь","ores"],["waxed_exposed_copper","","Вощеная слегка окисленная медь","ores"],["waxed_exposed_copper_bars","","Вощёные потемневшие медные прутья","ores"],["waxed_exposed_copper_bulb","","Вощеная слегка окисленная медная лампочка","redstone"],["waxed_exposed_copper_chain","","Вощеная слегка окисленная медная цепь","ores"],["waxed_exposed_copper_chest","","Вощеный слегка окисленный медный сундук","ores"],["waxed_exposed_copper_door","","Вощеная слегка окисленная медная дверь","ores"],["waxed_exposed_copper_golem_statue","","Вощеная слегка окисленная статуя медного голема","ores"],["waxed_exposed_copper_grate","","Вощеная слегка окисленная медная решетка","ores"],["waxed_exposed_copper_lantern","","Вощеный слегка окисленный медный фонарь","ores"],["waxed_exposed_copper_trapdoor","","Вощеный слегка окисленный медный люк","ores"],["waxed_exposed_cut_copper","","Вощеная слегка окисленная резная медь","ores"],["waxed_exposed_cut_copper_slab","","Вощеная слегка окисленная резная медная плита","ores"],["waxed_exposed_cut_copper_stairs","","Вощёные потемневшие пиленые медные ступеньки","ores"],["waxed_exposed_lightning_rod","","Вощеный слегка окисленный громоотвод","redstone"],["waxed_lightning_rod","","Вощеный громоотвод","redstone"],["waxed_oxidized_chiseled_copper","","Вощеная окисленная точеная медь","ores"],["waxed_oxidized_copper","","Вощеная окисленная медь","ores"],["waxed_oxidized_copper_bars","","Вощёные окисленные медные прутья","ores"],["waxed_oxidized_copper_bulb","","Вощеная окисленная медная лампочка","redstone"],["waxed_oxidized_copper_chain","","Вощеная окисленная медная цепь","ores"],["waxed_oxidized_copper_chest","","Вощеный окисленный медный сундук","ores"],["waxed_oxidized_copper_door","","Вощеная окисленная медная дверь","ores"],["waxed_oxidized_copper_golem_statue","","Вощеная окисленная статуя медного голема","ores"],["waxed_oxidized_copper_grate","","Вощеная окисленная медная решетка","ores"],["waxed_oxidized_copper_lantern","","Вощеный окисленный медный фонарь","ores"],["waxed_oxidized_copper_trapdoor","","Вощеный окисленный медный люк","ores"],["waxed_oxidized_cut_copper","","Вощеная окисленная резная медь","ores"],["waxed_oxidized_cut_copper_slab","","Вощеная окисленная резная медная плита","ores"],["waxed_oxidized_cut_copper_stairs","","Вощёные окисленные пиленые медные ступеньки","ores"],["waxed_oxidized_lightning_rod","","Вощеный окисленный громоотвод","redstone"],["waxed_weathered_chiseled_copper","","Вощеная полуокисленная точеная медь","ores"],["waxed_weathered_copper","","Вощеная полуокисленная медь","ores"],["waxed_weathered_copper_bars","","Вощёные состаренные медные прутья","ores"],["waxed_weathered_copper_bulb","","Вощеная полуокисленная медная лампочка","redstone"],["waxed_weathered_copper_chain","","Вощеная полуокисленная медная цепь","ores"],["waxed_weathered_copper_chest","","Вощеный полуокисленный медный сундук","ores"],["waxed_weathered_copper_door","","Вощеная полуокисленная медная дверь","ores"],["waxed_weathered_copper_golem_statue","","Вощеная полуокисленная статуя медного голема","ores"],["waxed_weathered_copper_grate","","Вощёная состаренная медная решётка","ores"],["waxed_weathered_copper_lantern","","Вощеный полуокисленный медный фонарь","ores"],["waxed_weathered_copper_trapdoor","","Вощеный полуокисленный медный люк","ores"],["waxed_weathered_cut_copper","","Вощеная полуокисленная резная медь","ores"],["waxed_weathered_cut_copper_slab","","Вощеная полуокисленная резная медная плита","ores"],["waxed_weathered_cut_copper_stairs","","Вощёные состаренные пиленые медные ступеньки","ores"],["waxed_weathered_lightning_rod","","Вощеный полуокисленный громоотвод","redstone"],["weathered_chiseled_copper","","Полуокисленная точеная медь","ores"],["weathered_copper","","Полуокисленная медь","ores"],["weathered_copper_bars","","Состаренные медные прутья","ores"],["weathered_copper_bulb","","Полуокисленная медная лампочка","redstone"],["weathered_copper_chain","","Полуокисленная медная цепь","ores"],["weathered_copper_chest","","Полуокисленный медный сундук","ores"],["weathered_copper_door","","Полуокисленная медная дверь","ores"],["weathered_copper_golem_statue","","Полуокисленная статуя медного голема","ores"],["weathered_copper_grate","","Полуокисленная медная решетка","ores"],["weathered_copper_lantern","","Полуокисленный медный фонарь","ores"],["weathered_copper_trapdoor","","Полуокисленный медный люк","ores"],["weathered_cut_copper","","Полуокисленная резная медь","ores"],["weathered_cut_copper_slab","","Полуокисленная резная медная плита","ores"],["weathered_cut_copper_stairs","","Состаренные пиленые медные ступеньки","ores"],["weathered_lightning_rod","","Полуокисленный громоотвод","redstone"],["web","Cobweb","Паутина","nature"],["weeping_vines","","Плакучая лоза","nature"],["wet_sponge","","Мокрая губка","nature"],["wheat","","Пшеница","nature"],["wheat_seeds","","Семена пшеницы","nature"],["white_candle","","Белая свеча","colored"],["white_carpet","","Белый ковёр","colored"],["white_concrete","","Белый бетон","colored"],["white_concrete_powder","","Белый цемент","colored"],["white_concrete_slab","","Белая бетонная плита","stone"],["white_concrete_stairs","","Белые бетонные ступеньки","stone"],["white_cushion","","Белая подушка","misc"],["white_dye","","Белый краситель","colored"],["white_glazed_terracotta","","Белая глазурованная терракота","colored"],["white_harness","","Белая упряжь","colored"],["white_shulker_box","","Белый ящик шалкера","colored"],["white_stained_glass","","Белое стекло","colored"],["white_stained_glass_pane","","Белая стеклянная панель","colored"],["white_terracotta","","Белая терракота","colored"],["white_tulip","","Белый тюльпан","nature"],["white_wool","","Белая шерсть","colored"],["white_wool_slab","","Плита из белой шерсти","misc"],["white_wool_stairs","","Ступеньки из белой шерсти","misc"],["wildflowers","","Полевые цветы","nature"],["wither_rose","","Роза Визера","nether_end"],["wither_skeleton_skull","","Череп визер-скелета","nether_end"],["wolf_armor","","Волчья броня","gear"],["wooden_axe","","Деревянный топор","gear"],["wooden_button","Oak Button","Кнопка из дуба","redstone"],["wooden_door","Oak Door","Дверь из дуба","wood"],["wooden_hoe","","Деревянная мотыга","gear"],["wooden_pickaxe","","Деревянная кирка","gear"],["wooden_pressure_plate","Oak Pressure Plate","Нажимная пластина из дуба","redstone"],["wooden_shovel","","Деревянная лопата","gear"],["wooden_spear","","Деревянное копьё","wood"],["wooden_sword","","Деревянный меч","gear"],["yellow_candle","","Желтая свеча","colored"],["yellow_carpet","","Жёлтый ковёр","colored"],["yellow_concrete","","Желтый бетон","colored"],["yellow_concrete_powder","","Желтый цемент","colored"],["yellow_concrete_slab","","Жёлтая бетонная плита","stone"],["yellow_concrete_stairs","","Жёлтые бетонные ступеньки","stone"],["yellow_cushion","","Жёлтая подушка","misc"],["yellow_dye","","Желтый краситель","colored"],["yellow_glazed_terracotta","","Желтая глазурованная терракота","colored"],["yellow_harness","","Желтая упряжь","colored"],["yellow_poplar_leaves","","Жёлтая листва тополя","nature"],["yellow_shulker_box","","Желтый ящик шалкера","colored"],["yellow_stained_glass","","Желтое стекло","colored"],["yellow_stained_glass_pane","","Желтая стеклянная панель","colored"],["yellow_terracotta","","Желтая терракота","colored"],["yellow_wool","","Желтая шерсть","colored"],["yellow_wool_slab","","Плита из жёлтой шерсти","misc"],["yellow_wool_stairs","","Ступеньки из жёлтой шерсти","misc"],["zombie_head","","Голова зомби","decor"]];    // [id, en, ru, category]
const ITEM_ALIAS = {"iron_ingot":["iron","железо","железный слиток"],"gold_ingot":["gold","золото","золотой слиток"],"copper_ingot":["copper","медь"],"diamond":["diamonds","алмазы","бриллиант","брилиант"],"emerald":["изумруды"],"netherite_ingot":["netherite","незерит"],"oak_log":["log","logs","wood","бревно","бревна","дерево"],"cobblestone":["cobble","булыга"],"cooked_beef":["steak","стейк"],"golden_apple":["god apple","золотое яблоко"],"enchanted_golden_apple":["notch apple","зачарованное золотое яблоко","зачарованное яблоко"],"tnt":["dynamite","тнт","динамит"],"ender_pearl":["жемчуг","эндер жемчуг"],"totem_of_undying":["totem","тотем"],"crafting_table":["workbench","верстак"],"furnace":["печка","печь"],"water_bucket":["water","ведро воды"],"lava_bucket":["lava","ведро лавы"],"redstone":["редстоун","красная пыль"],"coal":["уголь"],"stick":["палка","палки"],"torch":["факел","факелы"],"bow":["лук"],"arrow":["arrows","стрела","стрелы"],"shield":["щит"],"elytra":["элитры"],"trident":["трезубец"],"netherite_helmet":["незеритовый шлем"],"firework_rocket":["firework","фейерверк"]};

// bosses / OP mobs: blocked by default (votes needed = 0). Value = votes needed when you switch one on.
const BOSS_VOTES = {
  charged_creeper: 5, wither: 10, ender_dragon: 20, warden: 12, ravager: 5,
  elder_guardian: 6, ghast: 4, zoglin: 3, vindicator: 3, lightning_bolt: 8,
};
const CAT_LABELS = {
  gear: 'Armor, tools, weapons', food: 'Food', redstone: 'Redstone and rails', colored: 'Colored blocks',
  wood: 'Wood', ores: 'Ores, metals, gems', nether_end: 'Nether and End', nature: 'Nature and plants',
  stone: 'Stone and bricks', decor: 'Decoration and utility', misc: 'Other',
};

const MOBS_BY_KEY = new Map(MOBDATA.map((m) => [m[0], m]));
const ITEMS_BY_ID = new Map(ITEMDATA.map((i) => [i[0], i]));

// ---------------- settings ----------------
const DEFAULTS = {
  version: 4,                  // an older settings.json is ignored once, so new defaults apply
  tiktokUsername: 'xe_x7e_x7e_xe',
  userCooldownMs: 5000,        // per viewer
  typeCooldownMs: 5000,        // per item / mob kind (anyone)
  globalCooldownMs: 1500,
  maxItems: 2,                 // items per message
  maxMobs: 3,                  // mobs per message
  maxAlive: 10,                // chat-spawned mobs of the same kind alive at once
  allowEnchants: true,
  customProt: true,            // protection above the normal max = custom enchant (works like vanilla protection)
  enchantCap: 10,
  uncapEnchants: false,
  enchantMax: {},
  voteWindowMs: 45000,
  powerCooldownMs: 60000,
  power: Object.fromEntries(Object.keys(BOSS_VOTES).map((k) => [k, 0])), // votes needed, 0 = blocked
  disabledMobs: ['slime', 'magma_cube'],
  disabledCats: [],
  disabledItems: [],
  likeRules: [],               // {every: total likes, action: 'zombie 3'}
  giftRules: [],               // {gift: 'rose' or '*', min: diamonds, action: 'creeper', rep: repeat for combos}
  msgSpawn: true,              // "viewer: zombie near X" in chat
  msgVotes: true,              // vote progress
  msgLive: true,               // host sees live chat (not spawn commands)
  msgStatus: true,             // host sees connect/disconnect messages
  hud: 'squares',              // squares | bar | off
};

function loadSettings() {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch (e) { /* first run */ }
  if (s.version !== DEFAULTS.version) s = {};
  const out = { ...DEFAULTS, ...s };
  out.power = { ...DEFAULTS.power, ...(s.power || {}) };
  out.enchantMax = { ...(s.enchantMax || {}) };
  for (const k of ['disabledMobs', 'disabledCats', 'disabledItems', 'likeRules', 'giftRules']) {
    out[k] = Array.isArray(s[k]) ? s[k] : JSON.parse(JSON.stringify(DEFAULTS[k]));
  }
  return out;
}
let S = loadSettings();
function saveSettings() {
  try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(S, null, 2)); } catch (e) { console.error('save failed', e.message); }
}

// ---------------- name matching (English + Russian) ----------------
const STOP = new Set(['of', 'the', 'a', 'an', 'to', 'with', 'x']);
const FILLER = new Set(['please', 'pls', 'plz', 'spawn', 'give', 'summon', 'add', 'get', 'me', 'want', 'level', 'lvl',
  'дай', 'дайте', 'выдай', 'создай', 'заспавни', 'спавни', 'спавн', 'хочу', 'пусть', 'пожалуйста', 'плиз', 'мне', 'нам',
  'уровень', 'шт', 'штук', 'штуки', 'и', 'and']);

function normalize(t) {
  return String(t).toLowerCase().replace(/ё/g, 'е').replace(/[-_']/g, ' ').replace(/[^a-zа-я0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function stemWord(w) {
  if (/^[a-z0-9]+$/.test(w)) {
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  return w.length > 4 ? w.slice(0, 4) : w;
}
function words(s) {
  return normalize(s).split(' ').filter((w) => w && !STOP.has(w) && !(w.length <= 2 && /[а-я]/.test(w)));
}
function keyOf(ws) { return ws.map(stemWord).sort().join('|'); }

const NAMEMAP = new Map();
const EXACT = new Map();
function addName(str, entry) {
  const ws = words(str);
  if (!ws.length || ws.length > 4) return;
  const ek = ws.slice().sort().join('|');
  if (!EXACT.has(ek)) EXACT.set(ek, entry);
  const k = keyOf(ws);
  if (!NAMEMAP.has(k)) NAMEMAP.set(k, entry);
}
(function buildNames() {
  for (const m of MOBDATA) {
    const e = { kind: 'mob', id: m[0] };
    for (const a of m[4]) addName(a, e);
    addName(m[2], e);
    if (m[3]) addName(m[3], e);
    addName(m[0], e);
  }
  for (const i of ITEMDATA) {
    const e = { kind: 'item', id: i[0] };
    for (const a of (ITEM_ALIAS[i[0]] || [])) addName(a, e);
  }
  for (const i of ITEMDATA) addName(i[0], { kind: 'item', id: i[0] });
  for (const i of ITEMDATA) {
    const e = { kind: 'item', id: i[0] };
    if (i[1]) addName(i[1], e);
    addName(i[2], e);
  }
})();

// enchant words: [id, regex, vanilla max level]  (order: specific before general)
const ENCH = [
  ['projectile_protection', /projectile protection|защита от снаряд[а-я]*/, 4],
  ['blast_protection', /blast protection|защита от взрыв[а-я]*/, 4],
  ['fire_protection', /fire protection|защита от огн[а-я]*|огнеупорност[а-я]*/, 4],
  ['protection', /protection|защит[а-я]*/, 4],
  ['feather_falling', /feather falling|невесомост[а-я]*/, 4],
  ['thorns', /thorns|шипы|шипов|шип/, 3],
  ['respiration', /respiration|подводное дыхание|дыхание/, 3],
  ['aqua_affinity', /aqua affinity|подводник/, 1],
  ['depth_strider', /depth strider|покорител[а-я]* глубин/, 3],
  ['frost_walker', /frost walker|ледоход/, 2],
  ['soul_speed', /soul speed|скорость души/, 3],
  ['swift_sneak', /swift sneak|проворство/, 3],
  ['sharpness', /sharpness|остро[а-я]*/, 5],
  ['smite', /smite|небесн[а-я]* кар[а-я]*/, 5],
  ['bane_of_arthropods', /bane of arthropods|бич членистоногих/, 5],
  ['knockback', /knockback|отдача/, 2],
  ['fire_aspect', /fire aspect|заговор огня/, 2],
  ['looting', /looting|добыча/, 3],
  ['efficiency', /efficiency|эффективност[а-я]*/, 5],
  ['silk_touch', /silk touch|шелков[а-я]* касание/, 1],
  ['unbreaking', /unbreaking|прочност[а-я]*/, 3],
  ['luck_of_the_sea', /luck of the sea|везучий рыбак|морская удача|удача на рыбалке/, 3],
  ['fortune', /fortune|удача/, 3],
  ['power', /power|сила/, 5],
  ['punch', /punch|откидывание/, 2],
  ['flame', /flame|пламя/, 1],
  ['infinity', /infinity|бесконечность/, 1],
  ['lure', /lure|приманка/, 3],
  ['mending', /mending|починка/, 1],
  ['loyalty', /loyalty|верность/, 3],
  ['impaling', /impaling|пронзател[а-я]*|пронзание/, 5],
  ['riptide', /riptide|тягун|тяга/, 3],
  ['channeling', /channeling|громовержец/, 1],
  ['multishot', /multishot|тройной выстрел|мультивыстрел/, 1],
  ['piercing', /piercing|пронзающая стрела|бронебойность/, 4],
  ['quick_charge', /quick charge|быстрая перезарядка/, 3],
  ['binding', /binding|проклятие несъемности/, 1],
  ['vanishing', /vanishing|проклятие утраты/, 1],
];
const PROT_MAX = 255;

function enchLimit(id) {
  if (id === 'protection' && S.customProt) return PROT_MAX;
  if (S.uncapEnchants) return 32767;
  return S.enchantMax[id] !== undefined ? S.enchantMax[id] : S.enchantCap;
}
function parseEnchants(rest) {
  const list = [];
  let s = ' ' + rest.replace(/\b(level|lvl|уровень|ур)\b/g, ' ') + ' ';
  for (const [id, src, vmax] of ENCH) {
    const re = new RegExp('(?:' + src.source + ')\\s*(\\d+)?');
    const m = re.exec(s);
    if (!m) continue;
    let lvl = m[1] ? parseInt(m[1], 10) : vmax;
    if (!(lvl >= 1)) lvl = 1;
    let cap = enchLimit(id);
    if (id === 'protection' && S.customProt) cap = Math.min(cap, S.enchantMax.protection !== undefined ? S.enchantMax.protection : S.enchantCap);
    lvl = Math.min(lvl, cap);
    list.push({ id, lvl, vmax });
    s = s.replace(m[0], ' ');
  }
  return { list, left: s.replace(/\s+/g, ' ').trim() };
}

// returns { kind:'mob'|'item', id, count, ench } or null
function parse(text) {
  let s = String(text || '').toLowerCase();
  if (s.length > 140) return null;
  s = s.replace(/(\d+)\s*[xх]\b/g, '$1').replace(/\b[xх]\s*(\d+)/g, '$1');
  s = normalize(s);
  if (!s) return null;
  const tok = s.split(' ');
  while (tok.length && FILLER.has(tok[0])) tok.shift();
  let lead = null;
  if (tok.length && /^\d+$/.test(tok[0])) { lead = parseInt(tok[0], 10); tok.shift(); }
  while (tok.length && FILLER.has(tok[0])) tok.shift();
  if (!tok.length) return null;

  let hit = null;
  let n = 0;
  for (let k = Math.min(6, tok.length); k >= 1; k--) {
    const ws = words(tok.slice(0, k).join(' '));
    if (!ws.length || ws.length > 4) continue;
    const e = EXACT.get(ws.slice().sort().join('|')) || NAMEMAP.get(keyOf(ws));
    if (e) { hit = e; n = k; break; }
  }
  if (!hit) return null;

  let rest = tok.slice(n).join(' ');
  let ench = [];
  if (hit.kind === 'item') { const r = parseEnchants(rest); ench = r.list; rest = r.left; }
  let count = lead;
  for (const w of rest.split(' ').filter(Boolean)) {
    if (/^\d+$/.test(w)) { if (count === null) count = parseInt(w, 10); continue; }
    if (FILLER.has(w) || STOP.has(w)) continue;
    return null;                       // other words: it is a normal chat message, not a command
  }
  return { kind: hit.kind, id: hit.id, count: Math.min(Math.max(count || 1, 1), 1000), ench };
}

// ---------------- minecraft link ----------------
let mc = null;
let mcConn = 0;
// Minecraft's own encryption for remote websocket links (AES-256-CFB8 over the whole stream)
const ENCRYPT = process.env.ENCRYPT === '1' || (CLOUD && process.env.ENCRYPT !== '0');
const SPKI_P384 = Buffer.from('3076301006072a8648ce3d020106052b81040022036200', 'hex');
function wsSend(ws, str) {
  if (ws._enc) ws.send(ws._enc.update(Buffer.from(str, 'utf8')), { binary: true });
  else ws.send(str);
}
function raw(cmd) {
  if (!mc || mc.readyState !== 1 || mc._pending) return false;
  try {
    wsSend(mc, JSON.stringify({
      header: { version: 1, requestId: crypto.randomUUID(), messagePurpose: 'commandRequest', messageType: 'commandRequest' },
      body: { origin: { type: 'player' }, commandLine: cmd, version: 1 },
    }));
    return true;
  } catch (e) { return false; }
}
function sendMany(cmds) { cmds.forEach((c, i) => setTimeout(() => raw(c), i * 120)); }
function evt(name, obj) { return raw(`scriptevent ${name} ${JSON.stringify(obj)}`); }
function toHost(kind, text, extra) { evt('bot:msg', { k: kind, t: String(text).slice(0, 200), ...(extra || {}) }); }

// ---------------- spawning ----------------
function spawnMob(key, n, by) {
  const m = MOBS_BY_KEY.get(key);
  if (!m) return;
  evt('chat:mob', {
    key, id: 'minecraft:' + m[1], n, max: S.maxAlive, by, q: !S.msgSpawn,
    ev: key === 'charged_creeper' ? 'minecraft:become_charged' : undefined,
  });
}
function dropLoot(id, n, ench, by) {
  evt('chat:loot', {
    id: 'minecraft:' + id, n, by, q: !S.msgSpawn, cp: S.customProt,
    ench: (ench || []).map((e) => [e.id, e.lvl, e.vmax]),
  });
}
function perform(user, p) {
  if (p.kind === 'mob') {
    spawnMob(p.id, Math.min(p.count, S.maxMobs), user);
  } else {
    const it = ITEMS_BY_ID.get(p.id);
    const ench = S.allowEnchants ? p.ench : [];
    const n = ench.length ? 1 : Math.min(p.count, S.maxItems);
    dropLoot(p.id, n, ench, user);
    return it;
  }
}

// ---------------- boss votes ----------------
const votes = new Map();
const powerUntil = new Map();
const lastVoteMsg = new Map();
function vote(user, id) {
  const now = Date.now();
  if ((powerUntil.get(id) || 0) > now) return;
  let v = votes.get(id);
  if (!v) { v = new Map(); votes.set(id, v); }
  for (const [u, t] of v) if (now - t > S.voteWindowMs) v.delete(u);
  v.set(user, now);
  const need = S.power[id];
  const label = MOBS_BY_KEY.get(id)[2];
  if (v.size >= need) {
    votes.delete(id);
    powerUntil.set(id, now + S.powerCooldownMs);
    spawnMob(id, 1, 'chat');
    if (S.msgVotes) toHost('vote', `CHAT SUMMONED ${label.toUpperCase()}!`);
    console.log(`[${ts()}] BOSS SPAWN ${id}`);
  } else if (S.msgVotes && now - (lastVoteMsg.get(id) || 0) > 3000) {
    lastVoteMsg.set(id, now);
    toHost('vote', `${label}: ${v.size}/${need} votes`);
  }
}

// ---------------- chat handling ----------------
const lastUser = new Map();
const lastType = new Map();
let lastGlobal = 0;
let liveTimes = [];

function forwardLive(user, text) {
  if (!S.msgLive) return;
  const now = Date.now();
  liveTimes = liveTimes.filter((t) => now - t < 3000);
  if (liveTimes.length >= 5) return;
  liveTimes.push(now);
  evt('bot:msg', { k: 'live', u: String(user).slice(0, 24), t: String(text).slice(0, 120) });
}

function allowedByList(p) {
  if (p.kind === 'mob') return !S.disabledMobs.includes(p.id);
  const it = ITEMS_BY_ID.get(p.id);
  if (!it) return false;
  return !S.disabledCats.includes(it[3]) && !S.disabledItems.includes(p.id);
}

function handle(user, text) {
  const p = parse(text);
  if (!p) { forwardLive(user, text); return; }
  const safeUser = String(user).replace(/[^\w.]/g, '').slice(0, 20) || 'viewer';

  if (p.kind === 'mob' && BOSS_VOTES[p.id] !== undefined) {
    if (S.power[p.id] > 0) vote(safeUser, p.id);
    return;
  }
  if (!allowedByList(p)) return;

  const now = Date.now();
  if (now - lastGlobal < S.globalCooldownMs) return;
  if (now - (lastUser.get(safeUser) || 0) < S.userCooldownMs) return;
  const typeKey = p.kind + ':' + p.id;
  if (now - (lastType.get(typeKey) || 0) < S.typeCooldownMs) return;

  perform(safeUser, p);
  lastUser.set(safeUser, now);
  lastType.set(typeKey, now);
  lastGlobal = now;
  console.log(`[${ts()}] ${safeUser}: ${text}  ->  ${p.kind} ${p.id}`);
}

// the host's own rules (likes / gifts) ignore cooldowns and the block lists
function runRule(label, actionText) {
  const p = parse(actionText);
  if (!p) { console.log(`[${ts()}] rule action not understood: "${actionText}"`); return; }
  perform(label, p);
  console.log(`[${ts()}] rule (${label}): ${actionText}`);
}

// ---------------- likes and gifts ----------------
let likeSeen = -1;
const seenKeys = new Set();
function debugOnce(kind, d) {
  if (seenKeys.has(kind)) return;
  seenKeys.add(kind);
  try { console.log(`[${ts()}] first ${kind} event fields:`, Object.keys(d || {}).join(', ')); } catch (e) { /* ignore */ }
}
function onLike(d) {
  debugOnce('like', d);
  const add = Number(d.likeCount) || 1;
  const tot = Number(d.totalLikeCount) || 0;
  if (likeSeen < 0) likeSeen = tot > 0 ? Math.max(0, tot - add) : 0;
  const next = tot > likeSeen ? tot : likeSeen + add;
  for (const r of S.likeRules) {
    if (!(r.every > 0)) continue;
    const times = Math.floor(next / r.every) - Math.floor(likeSeen / r.every);
    for (let i = 0; i < Math.min(times, 3); i++) runRule(`${r.every} likes`, r.action);
  }
  likeSeen = next;
}
function onGift(d) {
  debugOnce('gift', d);
  const det = d.giftDetails || d.gift || {};
  const name = normalize(d.giftName || det.giftName || det.name || '');
  const type = d.giftType !== undefined ? d.giftType : det.giftType;
  if (type === 1 && d.repeatEnd !== true && d.repeatEnd !== 1) return;   // combo still running
  const count = Math.max(1, Number(d.repeatCount) || 1);
  const dia = (Number(d.diamondCount) || Number(det.diamondCount) || 0) * count;
  const who = String((d.user && d.user.uniqueId) || d.uniqueId || 'viewer');
  for (const r of S.giftRules) {
    const g = normalize(r.gift || '');
    if (g !== '*' && g !== 'any' && g !== name) continue;
    if (dia < (r.min || 0)) continue;
    const times = r.rep ? Math.min(count, 5) : 1;
    for (let i = 0; i < times; i++) runRule(`gift ${name || '*'} from ${who}`, r.action);
    break;
  }
}

// ---------------- settings: apply from menu / panel / commands ----------------
function num(v, lo, hi, d) {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(Math.max(Math.round(v), lo), hi) : d;
}
const bool = (v, d) => (v === undefined ? d : !!v);
const keepKnown = (arr, ok) => (Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && ok(x)) : []);

function applySection(sec, data) {
  const append = sec.endsWith('+');
  const base = append ? sec.slice(0, -1) : sec;
  const list = (cur, add) => (append ? [...cur, ...add] : add);
  switch (base) {
    case 'lim':
      S.maxItems = num(data.maxItems, 1, 2000, S.maxItems);
      S.maxMobs = num(data.maxMobs, 1, 100, S.maxMobs);
      S.maxAlive = num(data.maxAlive, 1, 200, S.maxAlive);
      S.enchantCap = num(data.ec, 1, 32767, S.enchantCap);
      S.userCooldownMs = num(data.uc * 1000, 0, 600000, S.userCooldownMs);
      S.globalCooldownMs = num(data.gc * 1000, 0, 600000, S.globalCooldownMs);
      S.typeCooldownMs = num(data.tc * 1000, 0, 600000, S.typeCooldownMs);
      S.voteWindowMs = num(data.vw * 1000, 1000, 600000, S.voteWindowMs);
      S.powerCooldownMs = num(data.pc * 1000, 0, 3600000, S.powerCooldownMs);
      S.allowEnchants = bool(data.allowEnchants, S.allowEnchants);
      S.uncapEnchants = bool(data.uncap, S.uncapEnchants);
      S.customProt = bool(data.cprot, S.customProt);
      break;
    case 'msg':
      S.msgSpawn = bool(data.spawn, S.msgSpawn);
      S.msgVotes = bool(data.votes, S.msgVotes);
      S.msgLive = bool(data.live, S.msgLive);
      S.msgStatus = bool(data.status, S.msgStatus);
      break;
    case 'hud':
      if (['squares', 'bar', 'off'].includes(data.mode)) S.hud = data.mode;
      break;
    case 'pow':
      for (const id of Object.keys(BOSS_VOTES)) if (data[id] !== undefined) S.power[id] = num(data[id], 0, 1000, S.power[id]);
      break;
    case 'ench':
      for (const [id] of ENCH) {
        if (data[id] === undefined) continue;
        const v = num(data[id], 1, 32767, S.enchantCap);
        if (v === S.enchantCap) delete S.enchantMax[id]; else S.enchantMax[id] = v;
      }
      break;
    case 'mobs': S.disabledMobs = list(S.disabledMobs, keepKnown(data, (x) => MOBS_BY_KEY.has(x) && BOSS_VOTES[x] === undefined)); break;
    case 'cats': S.disabledCats = list(S.disabledCats, keepKnown(data, (x) => CAT_LABELS[x] !== undefined)); break;
    case 'items': S.disabledItems = list(S.disabledItems, keepKnown(data, (x) => ITEMS_BY_ID.has(x))); break;
    case 'likes': {
      const add = (Array.isArray(data) ? data : []).map((r) => ({ every: num(r.every, 1, 10000000, 0), action: String(r.action || '').slice(0, 60) })).filter((r) => r.every > 0 && r.action);
      S.likeRules = list(S.likeRules, add);
      break;
    }
    case 'gifts': {
      const add = (Array.isArray(data) ? data : []).map((r) => ({ gift: String(r.gift || '').slice(0, 40), min: num(r.min, 0, 1000000, 0), action: String(r.action || '').slice(0, 60), rep: !!r.rep })).filter((r) => r.gift && r.action);
      S.giftRules = list(S.giftRules, add);
      break;
    }
    case 'itemname': {
      const hit = parse(String(data.t || ''));
      if (!hit) { toHost('reply', `I don't know "${data.t}".`); return; }
      const on = !!data.on;
      if (hit.kind === 'mob') {
        S.disabledMobs = S.disabledMobs.filter((x) => x !== hit.id);
        if (!on && BOSS_VOTES[hit.id] === undefined) S.disabledMobs.push(hit.id);
        if (BOSS_VOTES[hit.id] !== undefined) S.power[hit.id] = on ? BOSS_VOTES[hit.id] : 0;
      } else {
        S.disabledItems = S.disabledItems.filter((x) => x !== hit.id);
        if (!on) S.disabledItems.push(hit.id);
      }
      toHost('reply', `${hit.id.replace(/_/g, ' ')}: ${on ? 'allowed' : 'blocked'}`);
      break;
    }
    default: return;
  }
  changed();
}

let pushTimer = null;
function changed() {
  saveSettings();
  if (pushTimer) return;
  pushTimer = setTimeout(() => { pushTimer = null; pushCfg(false); }, 250);
}

// ---------------- settings: send to the addon (so the menu always shows the real values) ----------------
const pushed = new Map();
function sections() {
  return {
    lim: {
      maxItems: S.maxItems, maxMobs: S.maxMobs, maxAlive: S.maxAlive, ec: S.enchantCap,
      uc: S.userCooldownMs / 1000, gc: S.globalCooldownMs / 1000, tc: S.typeCooldownMs / 1000,
      vw: S.voteWindowMs / 1000, pc: S.powerCooldownMs / 1000,
      allowEnchants: S.allowEnchants, uncap: S.uncapEnchants, cprot: S.customProt,
    },
    msg: { spawn: S.msgSpawn, votes: S.msgVotes, live: S.msgLive, status: S.msgStatus },
    hud: { mode: S.hud },
    pow: S.power,
    ench: S.enchantMax,
    mobs: S.disabledMobs,
    cats: S.disabledCats,
    items: S.disabledItems,
    likes: S.likeRules,
    gifts: S.giftRules,
  };
}
function chunkSection(sec, val) {
  if (Array.isArray(val)) {
    const size = sec === 'likes' || sec === 'gifts' ? 3 : 20;
    if (!val.length) return [[sec, []]];
    const out = [];
    for (let i = 0; i < val.length; i += size) out.push([i === 0 ? sec : sec + '+', val.slice(i, i + size)]);
    return out;
  }
  if (sec === 'ench') {
    const e = Object.entries(val);
    if (!e.length) return [['ench', {}]];
    const out = [];
    for (let i = 0; i < e.length; i += 10) out.push([i === 0 ? 'ench' : 'ench+', Object.fromEntries(e.slice(i, i + 10))]);
    return out;
  }
  return [[sec, val]];
}
function pushCfg(force) {
  if (!mc || mc.readyState !== 1) return;
  const cmds = [];
  for (const [sec, val] of Object.entries(sections())) {
    const json = JSON.stringify(val);
    if (!force && pushed.get(sec) === json) continue;
    pushed.set(sec, json);
    for (const [s2, v2] of chunkSection(sec, val)) cmds.push(`scriptevent gui:set ${s2} ${JSON.stringify(v2)}`);
  }
  sendMany(cmds);
}

// ---------------- host commands typed in Minecraft chat ----------------
const USER = (process.argv[2] || S.tiktokUsername).replace(/^@/, '');
const ADMIN = process.argv[3] || 'ZaKaTiK009';
const seenSeq = new Set();

function reply(t) { toHost('reply', t); }
const onOff = (v) => (['on', '1', 'yes', 'true', 'вкл'].includes(String(v).toLowerCase()) ? true : (['off', '0', 'no', 'false', 'выкл'].includes(String(v).toLowerCase()) ? false : null));

function adminCommand(sender, text) {
  if (sender.toLowerCase() !== ADMIN.toLowerCase()) return;
  let t = text.trim();
  const seqM = t.match(/\s#(\d+)$/);
  const seq = seqM ? parseInt(seqM[1], 10) : null;
  if (seqM) t = t.slice(0, seqM.index);
  const a = t.split(/\s+/);
  const cmd = a[0].toLowerCase();

  if (cmd === '.cfg') {
    if (seq !== null) {
      raw(`scriptevent gui:ack ${seq}`);
      if (seenSeq.has(seq)) return;
      seenSeq.add(seq);
      if (seenSeq.size > 200) seenSeq.delete(seenSeq.values().next().value);
    }
    let data;
    try { data = JSON.parse(a.slice(2).join(' ')); } catch (e) { return; }
    applySection(String(a[1] || ''), data);
    return;
  }
  if (cmd === '.gui') { pushCfg(true); setTimeout(() => raw(`scriptevent gui:open ${sender}`), 900); return; }
  if (cmd === '.help') {
    reply('.gui = menu | .show | .max items|mobs|alive N | .ench cap N | .ench NAME LEVEL | .mob NAME on|off | .item NAME on|off');
    reply('.cat NAME on|off | .power NAME VOTES | .cd user|global|type SEC | .msg spawn|votes|live|status on|off | .hud squares|bar|off');
    return;
  }
  if (cmd === '.show') {
    reply(`items ${S.maxItems}, mobs ${S.maxMobs}, alive ${S.maxAlive}, enchant cap ${S.enchantCap}, custom protection ${S.customProt}, enchants ${S.allowEnchants}`);
    reply(`cooldown viewer ${S.userCooldownMs / 1000}s, kind ${S.typeCooldownMs / 1000}s, global ${S.globalCooldownMs / 1000}s | likes rules ${S.likeRules.length}, gift rules ${S.giftRules.length}`);
    reply(`blocked mobs: ${S.disabledMobs.join(', ') || 'none'} | blocked categories: ${S.disabledCats.join(', ') || 'none'}`);
    reply(`bosses on: ${Object.keys(S.power).filter((k) => S.power[k] > 0).join(', ') || 'none (all blocked)'}`);
    return;
  }
  const last = a[a.length - 1];
  const nameStr = a.slice(1, -1).join(' ');
  let ok = false;
  if (cmd === '.max' && ['items', 'mobs', 'alive'].includes((a[1] || '').toLowerCase())) {
    const v = num(a[2], 1, 2000, null);
    if (v !== null) { const k = a[1].toLowerCase(); if (k === 'items') S.maxItems = v; else if (k === 'mobs') S.maxMobs = v; else S.maxAlive = v; ok = true; }
  } else if (cmd === '.ench' && (a[1] || '').toLowerCase() === 'cap') {
    const v = num(a[2], 1, 32767, null); if (v !== null) { S.enchantCap = v; ok = true; }
  } else if (cmd === '.ench' && (a[1] || '').toLowerCase() === 'uncap') {
    const v = onOff(a[2]); if (v !== null) { S.uncapEnchants = v; ok = true; }
  } else if (cmd === '.ench') {
    const id = (a[1] || '').toLowerCase().replace(/-/g, '_');
    const v = num(a[2], 1, 32767, null);
    if (ENCH.some((e) => e[0] === id) && v !== null) { if (v === S.enchantCap) delete S.enchantMax[id]; else S.enchantMax[id] = v; ok = true; }
  } else if (cmd === '.mob' || cmd === '.item') {
    const v = onOff(last);
    if (v !== null) { applySection('itemname', { t: nameStr, on: v }); return; }
  } else if (cmd === '.cat') {
    const id = (a[1] || '').toLowerCase().replace(/-/g, '_');
    const v = onOff(a[2]);
    if (CAT_LABELS[id] !== undefined && v !== null) { S.disabledCats = S.disabledCats.filter((x) => x !== id); if (!v) S.disabledCats.push(id); ok = true; }
  } else if (cmd === '.gear') {
    const v = onOff(a[1]); if (v !== null) { S.disabledCats = S.disabledCats.filter((x) => x !== 'gear'); if (!v) S.disabledCats.push('gear'); ok = true; }
  } else if (cmd === '.enchants') {
    const v = onOff(a[1]); if (v !== null) { S.allowEnchants = v; ok = true; }
  } else if (cmd === '.power') {
    const id = (a[1] || '').toLowerCase().replace(/-/g, '_');
    const v = num(a[2], 0, 1000, null);
    if (BOSS_VOTES[id] !== undefined && v !== null) { S.power[id] = v; ok = true; }
  } else if (cmd === '.cd') {
    const k = (a[1] || '').toLowerCase();
    const v = num(Number(a[2]) * 1000, 0, 600000, null);
    if (v !== null && ['user', 'global', 'type'].includes(k)) {
      if (k === 'user') S.userCooldownMs = v; else if (k === 'type') S.typeCooldownMs = v; else S.globalCooldownMs = v;
      ok = true;
    }
  } else if (cmd === '.msg') {
    const k = (a[1] || '').toLowerCase();
    const v = onOff(a[2]);
    const map = { spawn: 'msgSpawn', votes: 'msgVotes', live: 'msgLive', status: 'msgStatus' };
    if (map[k] && v !== null) { S[map[k]] = v; ok = true; }
  } else if (cmd === '.hud') {
    const k = (a[1] || '').toLowerCase();
    if (['squares', 'bar', 'off'].includes(k)) { S.hud = k; ok = true; }
  } else {
    return;   // not one of our commands
  }
  if (ok) { changed(); reply('Saved. Applied right away.'); console.log(`[${ts()}] settings changed: ${text}`); }
  else reply('Wrong value. Type .help');
}

// ---------------- minecraft websocket server ----------------
const wsHttp = http.createServer((req, res) => { res.writeHead(200); res.end('ok'); });
wsHttp.on('error', (e) => console.error(`[${ts()}] server error:`, e.message || e));
wsHttp.listen(WS_PORT, CLOUD ? '0.0.0.0' : '127.0.0.1');
const wss = new WebSocketServer({
  server: wsHttp,
  verifyClient: (info) => {
    const ok = !SECRET || String(info.req.url || '').includes(SECRET);
    if (!ok) console.log(`[${new Date().toLocaleTimeString()}] game connection refused: wrong secret in the address`);
    return ok;
  },
});
function startSession(ws) {
  mc = ws;
  mcConn++;
  console.log(`[${ts()}] Minecraft connected!${ws._enc ? ' (encrypted)' : ''}`);
  raw('scriptevent bot:hello {}');
  wsSend(ws, JSON.stringify({
    header: { version: 1, requestId: crypto.randomUUID(), messagePurpose: 'subscribe', messageType: 'commandRequest' },
    body: { eventName: 'PlayerMessage' },
  }));
  setTimeout(() => { sendHeartbeat(); pushCfg(true); }, 700);
}
function onGameMessage(m) {
  const b = m && m.body;
  if (m.header && m.header.eventName === 'PlayerMessage' && b && ['chat', 'say', 'tell'].includes(b.type)) {
    const t = String(b.message || '');
    if (t.startsWith('.') && b.sender && b.sender !== 'External') adminCommand(String(b.sender), t);
  }
}
wsHttp.on('upgrade', (req) => console.log(`[${ts()}] connection attempt from the game (${String(req.url || '/').length > 1 ? 'with path' : 'no path'})`));
wss.on('connection', (ws) => {
  if (mc && mc !== ws) { try { mc.close(); } catch (e) { /* ignore */ } }
  ws._pending = false;
  let started = false;
  let ecdh = null;
  let salt = null;
  let timer = null;
  const begin = () => { if (started) return; started = true; if (timer) clearTimeout(timer); ws._pending = false; startSession(ws); };
  if (ENCRYPT) {
    ws._pending = true;
    ecdh = crypto.createECDH('secp384r1');
    ecdh.generateKeys();
    salt = crypto.randomBytes(16);
    const spki = Buffer.concat([SPKI_P384, ecdh.getPublicKey()]);
    mc = ws;
    ws.send(JSON.stringify({
      header: { version: 1, requestId: crypto.randomUUID(), messagePurpose: 'commandRequest', messageType: 'commandRequest' },
      body: { origin: { type: 'player' }, commandLine: `enableencryption "${spki.toString('base64')}" "${salt.toString('base64')}"`, version: 1 },
    }));
    timer = setTimeout(() => { console.log(`[${ts()}] no encryption answer from the game, continuing without`); begin(); }, 8000);
  } else {
    begin();
  }
  ws.on('message', (data) => {
    let text;
    try {
      let buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (ws._dec) buf = ws._dec.update(buf);
      text = buf.toString('utf8');
    } catch (e) { return; }
    let m;
    try { m = JSON.parse(text); } catch (e) { return; }
    if (ws._pending && !started) {
      const pk = m && m.body && m.body.publicKey;
      if (pk) {
        try {
          const theirs = Buffer.from(pk, 'base64');
          const point = theirs.subarray(theirs.length - 97);
          const shared = ecdh.computeSecret(point);
          const key = crypto.createHash('sha256').update(Buffer.concat([salt, shared])).digest();
          ws._enc = crypto.createCipheriv('aes-256-cfb8', key, key.subarray(0, 16));
          ws._dec = crypto.createDecipheriv('aes-256-cfb8', key, key.subarray(0, 16));
          begin();
        } catch (e) { console.error(`[${ts()}] encryption setup failed:`, e.message || e); begin(); }
      }
      return;
    }
    onGameMessage(m);
  });
  ws.on('error', (e) => console.error(`[${ts()}] Minecraft socket error:`, e.message || e));
  ws.on('close', (code) => {
    if (timer) clearTimeout(timer);
    if (mc === ws) mc = null;
    console.log(`[${ts()}] Minecraft disconnected (code ${code}). Type /wsserver again in the game.`);
  });
});
wss.on('error', (e) => console.error(`[${ts()}] websocket server error:`, e.message || e));

// ---------------- TikTok connection (reconnects by itself) ----------------
let tiktok = null;
let tkOn = false;
let retryTimer = null;
let retryDelay = 3000;
let connectedAt = 0;
let lastTikEvent = Date.now();
const seenMsg = new Set();
const statusLast = new Map();

function statusMsg(key, text, minGapMs) {
  console.log(`[${ts()}] ${text}`);
  const now = Date.now();
  if (now - (statusLast.get(key) || 0) < (minGapMs || 0)) return;
  statusLast.set(key, now);
  if (S.msgStatus) toHost('status', text);
}

function onChat(d) {
  if (!d) return;
  lastTikEvent = Date.now();
  if (d.msgId) {
    if (seenMsg.has(d.msgId)) return;
    seenMsg.add(d.msgId);
    if (seenMsg.size > 500) seenMsg.delete(seenMsg.values().next().value);
  }
  const text = d.comment !== undefined ? d.comment : d.content;   // library versions differ
  const u = d.user || {};
  handle(u.uniqueId || d.uniqueId || u.nickname || 'viewer', String(text || ''));
}

function scheduleReconnect(reason) {
  if (retryTimer) return;
  const wasOn = tkOn;
  tkOn = false;
  const up = connectedAt ? Math.round((Date.now() - connectedAt) / 1000) : 0;
  if (connectedAt && Date.now() - connectedAt > 60000) retryDelay = 3000;
  connectedAt = 0;
  const secs = Math.round(retryDelay / 1000);
  statusMsg('tk-down', `TikTok: ${reason}${up ? ` (was connected ${up}s)` : ''}. Reconnecting in ${secs}s...`, wasOn ? 0 : 300000);
  retryTimer = setTimeout(() => { retryTimer = null; startTikTok(); }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60000);
}

function startTikTok() {
  if (tiktok) {
    const old = tiktok;
    tiktok = null;
    try { old.removeAllListeners(); } catch (e) { /* ignore */ }
    old.on('error', () => {});
    try { old.disconnect(); } catch (e) { /* ignore */ }
  }
  const opts = { processInitialData: false, enableExtendedGiftInfo: false };
  if (process.env.TIKTOK_SESSIONID) opts.sessionId = process.env.TIKTOK_SESSIONID;
  if (process.env.EULER_API_KEY) opts.signApiKey = process.env.EULER_API_KEY;
  const conn = new Conn(USER, opts);
  tiktok = conn;
  conn.on('chat', onChat);
  conn.on('like', (d) => { lastTikEvent = Date.now(); try { onLike(d || {}); } catch (e) { console.error('like error', e.message); } });
  conn.on('gift', (d) => { lastTikEvent = Date.now(); try { onGift(d || {}); } catch (e) { console.error('gift error', e.message); } });
  for (const name of ['member', 'roomUser', 'social', 'follow', 'share', 'emote', 'envelope', 'subscribe']) conn.on(name, () => { lastTikEvent = Date.now(); });
  conn.on('error', (e) => console.error(`[${ts()}] TikTok error:`, (e && (e.message || e.info)) || e));
  conn.on('streamEnd', () => { if (conn === tiktok) scheduleReconnect('the live ended'); });
  conn.on('disconnected', () => { if (conn === tiktok) scheduleReconnect('connection closed'); });
  conn.connect()
    .then(() => {
      if (conn !== tiktok) return;
      tkOn = true;
      connectedAt = Date.now();
      lastTikEvent = Date.now();
      statusMsg('tk-up', `TikTok connected: @${USER}`, 0);
      sendHeartbeat();
    })
    .catch((e) => {
      if (conn === tiktok) scheduleReconnect('could not connect (is he live?) ' + ((e && e.message) || e));
    });
}

// ---------------- heartbeat + watchdog (keeps working after Android pauses Termux) ----------------
let hbSeq = 0;
function sendHeartbeat() { evt('bot:hb', { tk: tkOn ? 1 : 0, u: USER, a: ADMIN, c: mcConn, n: ++hbSeq }); }

let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  const gap = now - lastTick;
  lastTick = now;
  if (gap > 9000) {
    console.log(`[${ts()}] Termux was paused for ${Math.round(gap / 1000)}s. Reconnecting TikTok now.`);
    retryDelay = 3000;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    tkOn = false;
    startTikTok();
  } else if (tkOn && now - lastTikEvent > 150000) {
    statusMsg('tk-stale', 'TikTok: no data for 2.5 minutes, reconnecting', 60000);
    tkOn = false;
    startTikTok();
  }
  sendHeartbeat();
}, 3000);

// ---------------- settings panel (browser on the phone, optional) ----------------
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chat Spawn Settings</title><style>
body{font-family:sans-serif;margin:12px;background:#111;color:#eee}h2{margin:18px 0 6px;font-size:18px;color:#8bc34a}
.row{display:flex;justify-content:space-between;align-items:center;margin:6px 0;gap:8px}label{display:block;margin:5px 0}
input[type=number]{width:90px;padding:6px;background:#222;color:#fff;border:1px solid #444;border-radius:6px}
textarea{width:100%;height:90px;background:#222;color:#fff;border:1px solid #444;border-radius:6px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:2px 10px}button{padding:14px 28px;font-size:18px;background:#4caf50;color:#fff;border:0;border-radius:10px;position:sticky;bottom:10px}
small{color:#999}</style></head><body><h1>Chat Spawn Settings</h1><div id="app">Loading...</div>
<p><button onclick="save()">Save</button> <span id="msg"></span></p><script>
var D,M;function el(i){return document.getElementById(i)}function nice(s){return s.replace(/_/g,' ')}
function n(id,l,v){return '<div class="row"><span>'+l+'</span><input type="number" id="'+id+'" value="'+v+'"></div>'}
function c(id,l,on){return '<label><input type="checkbox" id="'+id+'"'+(on?' checked':'')+'> '+l+'</label>'}
function render(){var s=D.sec,l=s.lim,h='<h2>Limits</h2>'+n('maxItems','Max items per message',l.maxItems)+n('maxMobs','Max mobs per message',l.maxMobs)+n('maxAlive','Max of the same mob alive',l.maxAlive)+n('ec','Max enchant level',l.ec)+n('uc','Cooldown per viewer (sec)',l.uc)+n('tc','Cooldown per item/mob kind (sec)',l.tc)+n('gc','Global cooldown (sec)',l.gc)+n('vw','Vote window (sec)',l.vw)+n('pc','Cooldown after boss spawn (sec)',l.pc);
h+='<h2>Options</h2>'+c('ae','Allow enchants',l.allowEnchants)+c('cp','Custom protection above level 4',l.cprot)+c('un','Remove enchant cap (game may refuse)',l.uncap);
h+='<h2>Chat messages</h2>'+c('m1','Spawn announcements',s.msg.spawn)+c('m2','Vote messages',s.msg.votes)+c('m3','Live chat to host',s.msg.live)+c('m4','Status messages to host',s.msg.status);
h+='<h2>Item categories allowed</h2><div class="g">';Object.keys(M.cats).forEach(function(k){h+=c('c_'+k,M.cats[k],s.cats.indexOf(k)<0)});
h+='</div><h2>Mobs allowed</h2><div class="g">';M.mobs.forEach(function(k){h+=c('b_'+k[0],k[1],s.mobs.indexOf(k[0])<0)});
h+='</div><h2>Boss mobs: votes needed (0 = blocked)</h2>';M.boss.forEach(function(k){h+=n('p_'+k[0],k[1],s.pow[k[0]])});
h+='<h2>Max level per enchant</h2>';M.ench.forEach(function(e){var v=s.ench[e[0]]!==undefined?s.ench[e[0]]:l.ec;h+=n('e_'+e[0],nice(e[0])+' <small>(vanilla '+e[1]+')</small>',v)});
h+='<h2>Blocked items (ids, comma separated)</h2><textarea id="items">'+s.items.join(', ')+'</textarea>';
h+='<h2>Likes rules <small>[{"every":100,"action":"zombie 2"}]</small></h2><textarea id="likes">'+JSON.stringify(s.likes)+'</textarea>';
h+='<h2>Gift rules <small>[{"gift":"rose","min":0,"action":"creeper","rep":true}]</small></h2><textarea id="gifts">'+JSON.stringify(s.gifts)+'</textarea>';
el('app').innerHTML=h}
function save(){var D2={},l={maxItems:+el('maxItems').value,maxMobs:+el('maxMobs').value,maxAlive:+el('maxAlive').value,ec:+el('ec').value,uc:+el('uc').value,gc:+el('gc').value,tc:+el('tc').value,vw:+el('vw').value,pc:+el('pc').value,allowEnchants:el('ae').checked,cprot:el('cp').checked,uncap:el('un').checked};
D2.lim=l;D2.msg={spawn:el('m1').checked,votes:el('m2').checked,live:el('m3').checked,status:el('m4').checked};
D2.cats=Object.keys(M.cats).filter(function(k){return !el('c_'+k).checked});D2.mobs=M.mobs.filter(function(k){return !el('b_'+k[0]).checked}).map(function(k){return k[0]});
D2.pow={};M.boss.forEach(function(k){D2.pow[k[0]]=+el('p_'+k[0]).value});D2.ench={};M.ench.forEach(function(e){D2.ench[e[0]]=+el('e_'+e[0]).value});
D2.items=el('items').value.split(/[ ,\\n]+/).filter(Boolean);
try{D2.likes=JSON.parse(el('likes').value||'[]')}catch(e){alert('Likes rules: not valid JSON');return}
try{D2.gifts=JSON.parse(el('gifts').value||'[]')}catch(e){alert('Gift rules: not valid JSON');return}
fetch('/api',{method:'POST',body:JSON.stringify(D2)}).then(function(r){return r.json()}).then(function(d){D=d;el('msg').textContent='Saved! Applied right away.';setTimeout(function(){el('msg').textContent=''},2500)})}
fetch('/api').then(function(r){return r.json()}).then(function(d){D=d;M=d.meta;render()});
</script></body></html>`;

const META = {
  cats: CAT_LABELS,
  mobs: MOBDATA.filter((m) => BOSS_VOTES[m[0]] === undefined).map((m) => [m[0], m[2]]),
  boss: Object.keys(BOSS_VOTES).map((k) => [k, MOBS_BY_KEY.get(k)[2]]),
  ench: ENCH.map((e) => [e[0], e[2]]),
};
http.createServer((req, res) => {
  const json = (o) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.method === 'GET' && req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  if (req.method === 'GET' && req.url === '/api') return json({ sec: sections(), meta: META });
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 300000) req.destroy(); });
    req.on('end', () => {
      try {
        const o = JSON.parse(body);
        for (const k of ['lim', 'msg', 'pow', 'ench', 'mobs', 'cats', 'items', 'likes', 'gifts']) if (o[k] !== undefined) applySection(k, o[k]);
      } catch (e) { console.error('bad settings', e.message); }
      json({ sec: sections(), meta: META });
    });
    return;
  }
  res.writeHead(404); res.end();
}).on('error', (e) => console.error('settings panel error:', e.message)).listen(PANEL_PORT, '127.0.0.1', () => {});

// ---------------- start ----------------
process.on('uncaughtException', (e) => console.error(`[${ts()}] error (kept running):`, e && e.stack ? e.stack : e));
process.on('unhandledRejection', (e) => console.error(`[${ts()}] error (kept running):`, e && e.message ? e.message : e));

cp.execFile('termux-wake-lock', [], (err) => {
  console.log(err ? `[${ts()}] (no termux-wake-lock found: pull down the Termux notification and tap "Acquire wakelock")` : `[${ts()}] Wake lock on, Android should not pause Termux`);
});
console.log(`[${ts()}] In Minecraft type:  /wsserver localhost:${WS_PORT}      then  .gui`);
console.log(`[${ts()}] Settings page (optional): http://localhost:${PANEL_PORT}   | streamer: @${USER} | host: ${ADMIN}`);
startTikTok();
