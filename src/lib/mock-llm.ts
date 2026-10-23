/**
 * Fallback response generator used when the local GGUF server is temporarily offline or unreachable.
 * Dakshan AI delivers accurate, comprehensive waste awareness responses directly without intrusive disclaimer banners.
 */

export function generateMockWasteResponse(userQuery: string): string {
  const query = userQuery.toLowerCase().trim();

  // Scope check: Off-topic detection
  const offTopicKeywords = [
    'write code', 'javascript', 'python', 'recipe for cake', 'capital of',
    'who won', 'crypto', 'stock market', 'weather in', 'tell me a joke',
    'president', 'movie recommendation', 'write a poem', 'essay about', 'sing a song'
  ];

  if (offTopicKeywords.some((k) => query.includes(k))) {
    return `I am Dakshan AI, an assistant dedicated specifically to waste awareness and sorting. I cannot assist with topics outside waste management, but I would love to help you find the right bin, recycling rules, or disposal option for any household material or item!

Feel free to ask about items like pizza boxes, plastics, electronics, batteries, coffee cups, or composting.`;
  }

  // Conversational greetings (e.g. "hi", "hello")
  const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy', 'sup'];
  if (greetings.includes(query) || query === 'hi dakshan' || query === 'hello dakshan') {
    return `Hello! 👋 I am **Dakshan AI**, your dedicated waste awareness and sorting assistant.

Tell me what item, material, or packaging you need to dispose of (e.g., *used pizza box*, *lithium batteries*, *plastic takeout container*, *old phone*, or *coffee grounds*), and I'll guide you to the right bin or disposal method!`;
  }

  // Identity and Capabilities
  if (query.includes('who are you') || query.includes('what can you do') || query.includes('what is dakshan') || query === 'help') {
    return `I am **Dakshan AI**, an eco-assistant created to help you sort and divert household waste responsibly.

Here is what I can help you with:
- 🔵 **Recycling (Blue Bin)**: Checking plastic resin codes (#1, #2, #5), clean metals, paper, and glass bottles.
- 🟡 **Compost / Organics (Green Bin)**: Identifying compostable food scraps, unbleached paper, yard waste, and what to keep out.
- 🔴 **Hazardous Waste**: Safe disposal of batteries, motor oil, household chemicals, and fluorescent bulbs.
- 🟣 **E-Waste**: Electronics trade-in, certified recyclers, and cable drop-offs.
- ⚪ **Landfill / Trash**: Non-recyclable mixed materials and hard-to-recycle packaging.

Simply type any household item or material you want to sort!`;
  }

  // Gratitude
  if (query.includes('thank you') || query.includes('thanks') || query === 'thx') {
    return `You're very welcome! 🌿 Every item correctly sorted helps reduce landfill waste and protects our ecosystems. Feel free to ask anytime!`;
  }

  // Edge Case: Pizza Box
  if (query.includes('pizza') || query.includes('pizza box')) {
    return `**Category: Mixed (Compost + Recycling)**

Here is how to properly dispose of a used pizza box:

1. **Greasy Bottom Half**: Place this in your **Compost / Organics** bin (or trash if your community does not offer municipal food-waste collection). The oil and melted cheese soak into the paper fibers and cannot be washed out during recycling pulping.
2. **Clean Top Lid**: If the top lid is clean and grease-free, tear it off and put it in your **Recycling** bin!
3. **Plastic Pizza Saver**: The little plastic tripod in the center goes into the **Landfill / Trash** bin.

*Tip: Never place grease-stained cardboard into paper recycling, as it can ruin entire batches of recycled paper.*`;
  }

  // Edge Case: Batteries
  if (query.includes('battery') || query.includes('batteries')) {
    return `**Category: Hazardous Waste (Special Drop-Off Only)**

**DO NOT place batteries in curbside recycling or regular trash.**

- **Why it matters**: Crushed or punctured batteries in garbage trucks cause violent fires. They also contain heavy metals (lithium, lead, cadmium, nickel) that contaminate soil and groundwater.
- **What to do**:
  1. Tape the terminals of lithium or button-cell batteries with clear tape to prevent short circuits.
  2. Drop them off at dedicated battery collection bins available at hardware stores (e.g., Home Depot, Lowe's), electronics stores (Best Buy), or municipal hazardous waste depots.
  3. Single-use alkaline batteries are also accepted at most civic recycling depots or Call2Recycle drop-off points.`;
  }

  // Edge Case: Plastic Bags & Film
  if (query.includes('plastic bag') || query.includes('grocery bag') || query.includes('bubble wrap') || query.includes('plastic film')) {
    return `**Category: Store Drop-Off Only (DO NOT put in Curbside Recycling)**

- **Why**: Thin, flexible plastic films wrap tightly around the spinning sorting gears and shafts at Materials Recovery Facilities (MRFs), shutting down the entire recycling facility and endangering maintenance staff.
- **Proper Action**:
  - Collect clean, dry grocery bags, bread bags, produce bags, and bubble wrap.
  - Drop them in the dedicated **Plastic Bag Return Bins** located at the front entrance of most supermarkets and grocery stores.
  - If no store drop-off is accessible, dispose of them in your **Landfill / General Trash** bin.`;
  }

  // Edge Case: Plastic Bottles & Caps
  if (query.includes('water bottle') || query.includes('plastic bottle') || query.includes('soda bottle')) {
    return `**Category: Recycling (Blue Bin)**

Plastic beverage bottles (#1 PET and #2 HDPE) are widely accepted in curbside recycling:

1. **Empty and Rinse**: Pour out all leftover liquids. A quick rinse is enough—no need for soap.
2. **Cap On or Off?**: Most modern recycling facilities recommend screwing the plastic cap back on tightly so it doesn't fall through the sorting grates.
3. **Labels**: You do not need to peel off the plastic label; processing machines float them off during the wash cycle.`;
  }

  // Edge Case: Aluminum / Soda Cans
  if (query.includes('can') || query.includes('aluminum') || query.includes('tin can') || query.includes('soda can')) {
    return `**Category: Recycling (Blue Bin)**

Aluminum and steel/tin cans are among the most sustainable, infinitely recyclable materials on Earth:

1. **Empty Completely**: Rinse out any remaining beverage or soup residue.
2. **Leave Tabs Attached**: Keep pop-tabs attached to the can so they don't get lost as small metal fragments.
3. **Do Not Crush (if single-stream)**: Keep cans in their normal shape if your municipality uses automated optical/mechanical sorting, as flat cans can be mistakenly sorted as paper.`;
  }

  // Edge Case: Coffee Cups & Takeout Cups
  if (query.includes('coffee cup') || query.includes('starbucks') || query.includes('paper cup') || query.includes('takeout cup')) {
    return `**Category: Landfill / Mixed (Cup in Trash, Lid in Recycling)**

Disposable hot paper coffee cups cannot usually go into paper recycling:

1. **The Cup (Trash)**: Paper cups are lined with a thin interior plastic coating (polyethylene) to prevent leaking. Very few facilities can separate this plastic lining from the paper, so place the cup in the **Landfill / Trash** bin.
2. **The Plastic Lid (Recycling)**: Check the number on the lid (#5 or #6). Rigid plastic lids (#5 PP) can usually go into your **Recycling** bin if clean.
3. **The Cardboard Sleeve (Recycling)**: The cardboard heat sleeve is 100% recyclable in the **Blue Bin**!`;
  }

  // Edge Case: Compost items
  if (query.includes('compost') || query.includes('food scrap') || query.includes('organic') || query.includes('banana') || query.includes('apple') || query.includes('coffee ground')) {
    return `**Category: Compost / Organics (Green Bin)**

Here is a quick guide to what can and cannot go into compost:

**Accepted in Compost**:
- Fruit & vegetable peels, cores, and scraps
- Coffee grounds & unbleached paper coffee filters
- Crushed eggshells
- Yard waste: dry leaves, grass clippings, small twigs
- Plain, uncoated food-soiled paper towels or napkins

**Keep Out of Home Compost**:
- Meat, poultry, fish, bones, and dairy (attracts rodents and pests; acceptable only in some industrial municipal programs)
- Pet feces or cat litter (contains harmful parasites)
- Glossy or plastic-coated paper
- Diseased plants or invasive weeds

*Tip: Maintain a balance of "greens" (nitrogen-rich food scraps) and "browns" (carbon-rich dry leaves/cardboard) for odorless, healthy compost!*`;
  }

  // Edge Case: E-Waste & Electronics
  if (query.includes('phone') || query.includes('laptop') || query.includes('computer') || query.includes('cable') || query.includes('electronics') || query.includes('e-waste') || query.includes('charger')) {
    return `**Category: E-Waste (Electronic Waste Drop-Off)**

**Never throw electronics into the trash or curbside recycling bins.**

- **Why**: Electronics contain toxic elements (mercury, lead, flame retardants) as well as valuable precious metals (gold, silver, copper, rare-earth minerals) that should be reclaimed.
- **Action Steps**:
  1. Wipe your personal data and perform a factory reset.
  2. Check for retailer trade-in programs (Apple, Best Buy, carrier stores).
  3. Bring to an e-waste collection center, community recycling event, or certified R2/e-Stewards recyclers.
  4. Cables, chargers, and power cords are also accepted at e-waste recycling kiosks!`;
  }

  // Edge Case: Styrofoam / Polystyrene
  if (query.includes('styrofoam') || query.includes('polystyrene') || query.includes('foam')) {
    return `**Category: General Landfill / Trash**

- **Why**: Expanded polystyrene (Styrofoam #6) is over 90% air and easily fragments into microplastic beads that contaminate other recyclables and water systems. Most municipal single-stream facilities cannot process it.
- **Exceptions**: Some cities host designated drop-off sites with foam densifiers. Unless you have confirmed a specialized drop-off location locally, place foam packaging and take-out clamshells into the **Landfill** bin.`;
  }

  // Edge Case: Clothes & Textiles
  if (query.includes('clothes') || query.includes('clothing') || query.includes('textile') || query.includes('fabric') || query.includes('shoes') || query.includes('shirt')) {
    return `**Category: Donation / Textile Recovery (Do NOT put in curbside bins)**

Curbside recycling machinery cannot handle fabrics—they tangle around machinery shafts.

1. **Wearable Condition**: Donate gently used clothes and shoes to local thrift stores, charities, shelters, or community donation drop-boxes.
2. **Worn, Torn, or Stained**: Many clothing retailers (H&M, Patagonia, REI) offer textile take-back programs that shred scrap fabric into insulation, car padding, and cleaning rags.
3. **Repurpose at Home**: Old cotton shirts make great washable household cleaning cloths!`;
  }

  // Edge Case: Medicine & Pills
  if (query.includes('medicine') || query.includes('pill') || query.includes('pharmaceutical') || query.includes('drug') || query.includes('prescription')) {
    return `**Category: Hazardous / Pharmacy Take-Back (NEVER Flush)**

- **Never flush down the toilet or pour down the drain**: Wastewater treatment plants cannot remove all medicinal compounds, polluting rivers, drinking reservoirs, and aquatic ecosystems.
- **Proper Disposal**:
  1. Bring expired or unused medication to a pharmacy take-back drop box (CVS, Walgreens, municipal police station lobby, or DEA National Prescription Drug Take Back Day).
  2. If household disposal is the only option: Mix pills with an undesirable substance (coffee grounds or cat litter), seal in a container, and place in regular **Landfill / Trash**. Scratch off personal information on pill bottles.`;
  }

  // Edge Case: Broken Glass
  if (query.includes('broken glass') || query.includes('broken mirror') || query.includes('window') || query.includes('drinking glass')) {
    return `**Category: General Landfill / Trash (Handled with Care)**

- **Important**: Broken glass, light bulbs, mirrors, and window panes CANNOT be placed in curbside glass recycling. They have different chemical formulations and melting temperatures than bottle glass, ruining recycled batches.
- **Safety Step**: Wrap broken glass carefully in several layers of newspaper or seal it inside a cardboard box marked *"Broken Glass"* before placing it into the **Landfill / Trash** bin to protect sanitation workers.`;
  }

  // General fallback waste management guidance
  return `**General Waste Sorting Guidance**

To determine the right bin for your item, follow these core guidelines:

1. **Recycling (Blue Bin)**: Clean and dry paper, flattened cardboard, rigid plastic containers (#1, #2, #5), aluminum/tin cans, and empty glass jars/bottles. Ensure they are free from food residue.
2. **Compost / Organics (Green Bin)**: Fruit & vegetable scraps, coffee grounds, eggshells, yard trimmings, and unbleached food-soiled paper napkins.
3. **Hazardous Waste**: Household batteries, automotive chemicals, paints, and fluorescent bulbs must go to specialized drop-off locations. Never bin in regular trash.
4. **E-Waste**: Cords, appliances, and electronic devices belong at certified e-waste recovery centers.
5. **Landfill (Trash)**: Mixed materials, flexible chip bags, soft plastic wraps, styrofoam, and contaminated containers.

*Local waste sorting regulations can vary depending on your municipality's processing facilities. When in doubt, consult your local waste authority or city portal!*`;
}
