import os
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

class TrafficNarrator:
    def __init__(self, base_url="http://100.107.46.86:1234/v1", api_key="lm-studio"):
        """
        Initialize the LLM client. 
        Default base_url matches the user's provided local server (assuming /v1 standard).
        Default api_key is often 'lm-studio' or 'sk-...' for local servers, doesn't matter much if auth disabled.
        """
        # Allow env var overrides
        self.base_url = os.getenv("LLM_BASE_URL", base_url)
        self.api_key = os.getenv("LLM_API_KEY", api_key)
        
        try:
            self.client = OpenAI(base_url=self.base_url, api_key=self.api_key)
            logger.info(f"TrafficNarrator initialized with base_url: {self.base_url}")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            self.client = None

    def generate_summary(self, context: dict):
        """
        Generate a traffic summary based on the provided context dictionary.
        Context should include:
        - metrics: RL metrics (avg counts, congestion index)
        - yolo: Real-time YOLO counts
        - sumo: Simulation stats (if running)
        """
        if not self.client:
            return "Traffic summary unavailable (LLM service not initialized)."

        # Construct a clear prompt
        prompt = self._construct_prompt(context)
        
        try:
            logger.info("Sending prompt to LLM...")
            response = self.client.chat.completions.create(
                model="lfm2.5-vl-1.6b", # Model name often ignored by local servers
                messages=[
                    {"role": "system", "content": "You are a helpful traffic assistant. Analyze the data and provide a short, simple summary for a public dashboard. Focus on congestion and estimated wait times. Keep it under 50 words."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=100
            )
            summary = response.choices[0].message.content.strip()
            return summary
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return "Current traffic info unavailable due to service error."

    def _construct_prompt(self, context):
        counts = context.get('yolo', {})
        rl = context.get('rl', {})
        sumo = context.get('sumo', {})
        
        # Format the data
        text = "Current Traffic Data:\n"
        
        if counts:
            text += f"- Vehicle Counts: North:{counts.get('North',0)}, South:{counts.get('South',0)}, East:{counts.get('East',0)}, West:{counts.get('West',0)}\n"
        
        if rl:
            avgs = rl.get('avg_counts', {})
            text += f"- 10-min Avg Volume: North:{avgs.get('North',0):.1f}, South:{avgs.get('South',0):.1f}\n"
            text += f"- AI Congestion Index: {rl.get('predicted_congestion_index', 0):.2f}\n"
            
        if sumo:
            text += f"- Sim Queue Length: {sumo.get('queue_length', 0)} vehicles\n"
            text += f"- Max Waiting Time: {sumo.get('waiting_time', 0):.1f} seconds\n"
        
        text += "\nBased on this, what is the traffic status? Mention if it's congested and estimated wait time."
        return text
