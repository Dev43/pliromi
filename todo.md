
We are creating Pliromi - payment in greek

Pliromi is a store and treasury management system using the open wallet standard (https://github.com/open-wallet-standard/core) and MPP/x402 for payments. It allows a store owner to manage his float, his inventory with the help of agents and humans.

The system will have a backend, where all agentic and payment related code lives. It will also have 2 different frontend, one for the administrator that shows all of the addresses and balances in the treasury, has a chat interface powered by XMTP to chat to agents and humans alike in the organization. It also has a simple inventory management system for the store, allowing it to set prices (min and max price) for items that we are selling. We will allow agents to haggle for the best price possible. The other interface is the store itself. It is public facing and shows the items we are selling, a price and accepts payments using mpp/x402. The store itself is a webmcp server so any agent can navigate the store.  

Here is a step by step ideal case scenario:


Add your organization name. How many peolpe you want in it etc
Onboarding: on the admin dashboard, you add your organization name and a small description of the store. After this OWS (https://github.com/open-wallet-standard/core) keys get created (created for real if they don't exist, we will have keys called hackathon that we will be using). 

It will ask me how many people I would like to have in the organization. I add one "human" which creates an api key for that user. When I create an api key, I get to choose the policy (max spend, daily spend limit) as per https://docs.openwallet.sh/doc.html?slug=03-policy-engine. You can also decide on a pre-built policy.

 And then it also ask me if I want to create agents. Some agents are pre-created, those being:

- A treasurer agent. His job is to look at the float (all of the balances in all the account). He will be in charge of making sure that 30% of our float is in Lulo. https://dev.lulo.fi/api-reference/v1/generate.transactions.deposit - Lulo is only on Solana so if the agent needs to bridge to another chain he will need to use moonpay http://github.com/moonpay/skills/blob/main/skills/moonpay-swap-tokens/SKILL.md - currently let's have this agent run every 5 minutes. Let's also have a flag in .env to stop him from waking up if needed

- A seller agent. That agent is in charge of selling the product. You can haggle the agent, to try to get the best price (never below the minimum price). The agent is in charge of telling the other agent how to pay (using x402 or mpp) and in what currency/chain. This agent is also in charge of managing inventory.


Once that is complete, the onboarding is finished and we get on to the main screen. On the main screen, on the left we see all the addresses that we have in our OWS wallet with their respective balances (usdc and native token).


 In the middle we see what we have in stock and what we are selling it for. We can add things to sell, change prices (min max).
On the right we have an XMTP (https://docs.xmtp.org/chat-apps/intro/get-started) chat interface. Create a group chat with XMTP https://docs.xmtp.org/chat-apps/core-messaging/create-conversations
Add members https://docs.xmtp.org/chat-apps/core-messaging/group-permissions


We log in to this interface using a wallet browser extension (rabby or metamask). When we log in we create a group chat that we invite all the other agents to. All the agents are listening to the group chat and they will be sending updates on what they are doing to that group chat.

On a button at the top saying "manage team" we go to a page where we see all of the agents and api keys we have crearted, see their policy and are able to update the policy if needed. We can also revoke entirely their api keys if needed.

Back on the main screen where all the addresses are we have a button to fund the addresses. This will call `ows fund deposit --wallet hackathon` to create a deposit to the address in question. It will show a QR code and the address to send the deposit to. Warn the user only to send USDC. You can select which blockhain to send on.

In another page, we use Laso finance https://laso.finance/get-card to create a debit card for the store. That debit card will be paid using x402

 it will take care of the x402
// Order a $50 prepaid card
const { data } = await client.get("https://laso.finance/get-card", {
  params: { amount: 50 },
});
Make sure to store the debit card details in file storage, they are real debit cards.
We can create multiple debit cards, one for each agent if we wanted (or human) - Ideally we would like to save those credentials in the keystore -- *possible addition to the OWS standard*


Now on the storefront. It will be a simple public page that is good looking with everything that our store sells. It will show the price of the items and allow someone to purchase it using x402. The page itself is a webmcp server so any agent can use the website directly and pay for it. Have a claude instance go ahead and buy the things it needs.



STRETCH GOALS

- Can use moonpay commerce to browse shopify stores.
- Add a chat into our store to haggle for the price (with the seller agent using Claude)
