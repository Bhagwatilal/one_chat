export const PLAYAI_API_KEY = 'ak-045ca85601c240e6b16f1445bca65d69';
export const PLAYAI_USER_ID = 'hzcZoVzcinXL47oaEDvEBZ4RjDq2';
export const PLAYAI_AGENT_ID = 'w7fyr7oJKx1rUMdExDe2B';

export const initPlayAI = () => {
  if (window.PlayAI) {
    window.PlayAI.init({
      apiKey: PLAYAI_API_KEY,
      userId: PLAYAI_USER_ID
    });
  }
};

export const openPlayAI = () => {
  if (window.PlayAI) {
    window.PlayAI.open(PLAYAI_AGENT_ID);
  }
};