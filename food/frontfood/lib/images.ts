/** Photos vérifiées une à une (chargées et inspectées) avant intégration. */
function unsplash(id: string, w = 1200) {
  return `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;
}

export const IMAGES = {
  heroBurger: unsplash("1568901346375-23c9450c58cd", 1200),
  hotdog: unsplash("1619740455993-9e612b1af08a", 400),
  sandwich: unsplash("1509722747041-616f39b57569", 400),
  chicken: unsplash("1626082927389-6cd097cdc6ec", 400),
  biryani: unsplash("1642821373181-696a54913e93", 400),
  fries: unsplash("1573080496219-bb080dd4f877", 400),
  pizza: unsplash("1513104890138-7c749659a591", 400),
  aboutBurger: unsplash("1550547660-d9450f859349", 1000),
  beefBurgerDark: unsplash("1571091718767-18b5b1457add", 900),
  beefBurgerStack: unsplash("1553979459-d2229ba7433b", 900),
  pizzaSlice: unsplash("1555072956-7758afb20e8f", 900),
  tacos: unsplash("1552332386-f8dd00dc2f85", 1100),
  burrito: unsplash("1626700051175-6818013e1d4f", 900),
  sodaBurger: unsplash("1550547660-d9450f859349", 1000),
  avatar1: unsplash("1633332755192-727a05c4013d", 160),
  avatar2: unsplash("1494790108377-be9c29b29330", 160),
  avatar3: unsplash("1500648767791-00dcc994a43e", 160),

  // Ajoutés pour le catalogue marketplace (lib/data/) — vérifiées de la même façon.
  pasta: unsplash("1481931098730-318b6f776db0", 900),
  saladBowl: unsplash("1512621776951-a57141f2eefd", 900),
  pokeBowl: unsplash("1546069901-ba9599a7e63c", 900),
  burgerAlt: unsplash("1551782450-a2132b4ba21d", 900),
  pancakes: unsplash("1567620905732-2d1ec7ab7445", 900),
  tiramisu: unsplash("1571877227200-a0d98ea607e9", 900),
  iceCreamSundae: unsplash("1551024506-0bccd828d307", 900),
  chocolateCake: unsplash("1578985545062-69928b1d9587", 900),
  cookies: unsplash("1568051243858-533a607809a5", 900),
  coffeeLattes: unsplash("1495474472287-4d71bcdd2085", 900),
  teaCookies: unsplash("1544787219-7f47ccb76574", 900),
  fruitPunch: unsplash("1595981267035-7b04ca84a82d", 900),
  strawberryDrink: unsplash("1497534446932-c925b458314e", 900),
};
