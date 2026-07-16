export interface MenuItem {
	id: string;
	name: string;
	description: string;
	priceCents: number;
}

// Mocked menu data — the demo does not call Pedro's real menu API.
export const MENU: MenuItem[] = [
	{
		id: "burger-classic",
		name: "Classic Burger",
		description: "Beef patty, cheddar, lettuce, tomato, house sauce",
		priceCents: 8500,
	},
	{
		id: "burger-chicken",
		name: "Chicken Burger",
		description: "Grilled chicken breast, avo, bacon, aioli",
		priceCents: 8900,
	},
	{
		id: "pizza-margherita",
		name: "Margherita Pizza",
		description: "Tomato, mozzarella, basil",
		priceCents: 9500,
	},
	{
		id: "salad-greek",
		name: "Greek Salad",
		description: "Feta, olives, cucumber, tomato, red onion",
		priceCents: 6500,
	},
	{
		id: "fries",
		name: "Fries",
		description: "Crispy fries, side of mayo",
		priceCents: 3500,
	},
	{
		id: "coke",
		name: "Coca-Cola",
		description: "330ml can",
		priceCents: 2000,
	},
];

export function findMenuItem(id: string): MenuItem | undefined {
	return MENU.find((item) => item.id === id);
}
