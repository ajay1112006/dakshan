/**
 * Simple, concise fallback response generator used when external AI servers are offline.
 * Answers are kept short, simple, and direct.
 */

export function generateMockWasteResponse(userQuery: string): string {
  const query = userQuery.toLowerCase().trim();

  // 1. Off-topic detection
  const offTopicRegex = /\b(code|coding|python|javascript|typescript|c\+\+|java|html|css|sql|crypto|bitcoin|stock market|president|election|recipe|weather|joke|poem|essay|song|capital of|who won|math|calculus)\b/i;
  if (offTopicRegex.test(query)) {
    return `I am **Dakshan AI**, dedicated specifically to waste awareness and sorting.

Please ask about any household item or packaging (like pizza boxes, plastics, batteries, or food scraps) and I'll tell you how to dispose of it!`;
  }

  // 2. Greetings
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|sup)\b/i.test(query)) {
    return `Hello! 👋 I am **Dakshan AI**. What item or material do you need to dispose of or recycle today?`;
  }

  // 3. Spilled tea, coffee, liquids, wipes & napkins
  if (/\b(tea|coffee spill|spilled|spill|spilt|wipe|wipes|paper towel|napkin)\b/i.test(query)) {
    return `**Category: Compost or Trash**

- **Paper towels or napkins used for spills**: Put in **Compost / Organics** (or regular trash if you don't compost).
- **Cloth rags**: Wash and reuse!
- **Tea bags or loose tea leaves**: Put in **Compost** (remove any metal staples first).`;
  }

  // 4. Pizza box
  if (query.includes('pizza')) {
    return `**Category: Mixed (Compost + Recycling)**

- **Greasy bottom half**: Put in **Compost / Organics** (or trash). Grease ruins paper recycling.
- **Clean top lid**: Tear off and put in **Recycling**.
- **Plastic center tripod**: Put in **Trash**.`;
  }

  // 5. Batteries
  if (/\b(batter|batteries)\b/i.test(query)) {
    return `**Category: Hazardous Waste (Special Drop-Off)**

Never toss batteries into regular trash or recycling—they cause truck and facility fires. Drop them off at dedicated battery collection boxes located at most hardware stores, electronics shops, or municipal drop-offs.`;
  }

  // 6. Plastic bags and film
  if (query.includes('plastic bag') || query.includes('grocery bag') || query.includes('bubble wrap') || query.includes('film')) {
    return `**Category: Store Drop-Off Only**

Do not put flexible plastic bags in curbside recycling bins (they tangle and jam the sorting machinery). Bring clean bags to supermarket return bins, or reuse them.`;
  }

  // 7. Plastic bottles and cups
  if (query.includes('water bottle') || query.includes('plastic bottle') || query.includes('soda bottle')) {
    return `**Category: Recycling (Blue Bin)**

Empty any leftover liquid, give it a quick rinse, screw the cap back on tightly, and place it in your **Recycling** bin.`;
  }

  // 8. Aluminum & tin cans
  if (/\b(can|cans|aluminum|tin can|soda can)\b/i.test(query)) {
    return `**Category: Recycling (Blue Bin)**

Rinse out leftover food or drink and place the can in your **Recycling** bin. Pop-tabs can stay attached.`;
  }

  // 9. Takeout coffee cups
  if (query.includes('coffee cup') || query.includes('paper cup') || query.includes('takeout cup') || query.includes('starbucks')) {
    return `**Category: Trash / Landfill**

Most paper coffee cups have an invisible plastic coating inside to prevent leaking, so the cup goes into **Trash**. The cardboard sleeve can go into **Recycling**, and plastic lids are recyclable if marked #5.`;
  }

  // 10. Compost / Food Scraps
  if (query.includes('compost') || query.includes('food scrap') || query.includes('banana') || query.includes('apple') || query.includes('vegetable')) {
    return `**Category: Compost / Organics (Green Bin)**

Fruit and vegetable scraps, coffee grounds, eggshells, and yard trimmings belong in **Compost**. Avoid putting meat, dairy, or pet waste into backyard home compost.`;
  }

  // 11. E-Waste & Electronics
  if (/\b(phone|laptop|computer|cable|charger|electronics|e-waste|gadget)\b/i.test(query)) {
    return `**Category: E-Waste (Special Drop-Off)**

Never put electronics or cables in curbside trash or recycling. Take old devices, chargers, and cords to an electronics store drop-off (such as Best Buy) or your city's e-waste recycling depot.`;
  }

  // 12. Styrofoam / Polystyrene
  if (query.includes('styrofoam') || query.includes('foam') || query.includes('polystyrene')) {
    return `**Category: Trash / Landfill**

Place styrofoam packaging and takeout containers into the **Trash / Landfill** bin. Curbside recycling facilities cannot process foam.`;
  }

  // 13. Clothes & Textiles
  if (/\b(clothes|clothing|textile|fabric|shirt|pants|shoes)\b/i.test(query)) {
    return `**Category: Donation / Textile Recycling**

Do not place textiles in curbside recycling bins. Donate wearable items to thrift stores or drop old fabrics into clothing recycling bins found at many retailers.`;
  }

  // 14. Medicine & Pills (Strict word-boundary matching)
  if (/\b(pills?|medication|medications|pharmaceutical|prescriptions?)\b/i.test(query)) {
    return `**Category: Hazardous / Pharmacy Drop-Off**

Never flush medication down the toilet or drain. Bring expired or unused pills to a pharmacy take-back drop box (like CVS or Walgreens) for safe disposal.`;
  }

  // 15. Broken glass
  if (query.includes('broken glass') || query.includes('broken mirror') || query.includes('window')) {
    return `**Category: Trash / Landfill (Wrap Safely)**

Wrap broken glass securely in several layers of newspaper or inside a small cardboard box and place it in the **Trash**. Do not put broken glass in curbside recycling.`;
  }

  // 16. General short guidance
  return `**General Waste Sorting Guide**

- **Recycling (Blue Bin)**: Clean paper, cardboard, rigid plastic containers (#1, #2, #5), cans, and glass jars.
- **Compost (Green Bin)**: Fruit & vegetable scraps, coffee grounds, eggshells, and food-soiled paper napkins.
- **Trash (Landfill)**: Styrofoam, chip bags, plastic wraps, and non-recyclables.
- **Hazardous/E-Waste**: Batteries, lightbulbs, and electronics (take to drop-off centers).`;
}
