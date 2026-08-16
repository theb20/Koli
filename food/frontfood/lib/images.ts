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
};
