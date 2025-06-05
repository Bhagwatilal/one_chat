// Main Account Megan
// export const PLAYAI_API_KEY = 'ak-fca70282308c412a8723fd7dc7a0826c';
// export const PLAYAI_USER_ID = 'hzcZoVzcinXL47oaEDvEBZ4RjDq2';
// export const PLAYAI_AGENT_ID = 'w7fyr7oJKx1rUMdExDe2B';

//Second New Account -Not working
// export const PLAYAI_API_KEY = 'ak-883b2dbac61d450f997210c872ff48d5';
// export const PLAYAI_USER_ID = 'zl5u5NfIP1VXkXEqmLUsmh23GRB2';
// export const PLAYAI_AGENT_ID = 'KRXtLjSs-_zroBASjUuqF';


// Main Account Megan- New Agent
// export const PLAYAI_API_KEY = 'ak-fca70282308c412a8723fd7dc7a0826c';
// export const PLAYAI_USER_ID = 'hzcZoVzcinXL47oaEDvEBZ4RjDq2';
// export const PLAYAI_AGENT_ID = 'eJxcguFiR5iync8q8LQAM';

// Define credentials for different personas
const CREDENTIALS = {
  srk: {
    apiKey: 'ak-47d4ce20355c48d2a07da8bed1e7466a',
    userId: '4PndcB9lbPbSpruYOQtGPJ02nfj2',
    agentId: 'Fx0p1PhKh-EzitmuBV47N'
  },
  ratanTata: {
    apiKey: 'ak-5ad8e4d13d2e4557b1633057657a6e82', 
    userId: '5lQ7E5qbiXWCdZ6yw4RhAfP61f82',
    agentId: 'zFKdgZGfcSrXs6rahx0jW'
  }
};

// Default to Ratan Tata credentials
export let PLAYAI_API_KEY = CREDENTIALS.ratanTata.apiKey;
export let PLAYAI_USER_ID = CREDENTIALS.ratanTata.userId;
export let PLAYAI_AGENT_ID = CREDENTIALS.ratanTata.agentId;

// Function to switch credentials
export const switchPersona = (persona: 'srk' | 'ratanTata') => {
  switch(persona) {
    case 'srk':
      PLAYAI_API_KEY = CREDENTIALS.srk.apiKey;
      PLAYAI_USER_ID = CREDENTIALS.srk.userId;
      PLAYAI_AGENT_ID = CREDENTIALS.srk.agentId;
      break;
    case 'ratanTata':
      PLAYAI_API_KEY = CREDENTIALS.ratanTata.apiKey;
      PLAYAI_USER_ID = CREDENTIALS.ratanTata.userId;
      PLAYAI_AGENT_ID = CREDENTIALS.ratanTata.agentId;
      break;
  }
};

export const initPlayAI = () => {
  if (window.PlayAI) {
    window.PlayAI.init({
      apiKey: PLAYAI_API_KEY,
      userId: PLAYAI_USER_ID
    });
  }
};

// export const openPlayAI = () => {
//   if (window.PlayAI) {
//     window.PlayAI.open(PLAYAI_AGENT_ID);
//   }
// };