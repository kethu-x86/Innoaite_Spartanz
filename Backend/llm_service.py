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

    def generate_summary(self, context: dict, junction_name: str = "Kochi Junction"):
        """
        Generate a traffic summary based on the provided context dictionary.
        Context should include:
        - metrics: RL metrics (avg counts, congestion index)
        - yolo: Real-time YOLO counts
        - sumo: Simulation stats (if running)
        - alerts: Current alert info
        - violations: Violation count
        - emergency: Emergency state
        """
        if not self.client:
            return "Traffic summary unavailable (LLM service not initialized)."

        # Construct a clear prompt
        prompt = self._construct_prompt(context, junction_name)
        
        try:
            logger.info("Sending prompt to LLM...")
            response = self.client.chat.completions.create(
                model="lfm2.5-vl-1.6b",
                messages=[
                    {"role": "system", "content": (
                        "You are a helpful traffic assistant for the Kochi Smart Traffic Management System. "
                        "Analyze the data and provide a concise, actionable summary for authorities. "
                        "Mention specific junction names, directions with high congestion, estimated wait times, "
                        "and any active alerts or violations. If there is an emergency vehicle, highlight it prominently. "
                        "Keep the response under 80 words."
                    )},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            summary = response.choices[0].message.content.strip()
            return summary
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return "Current traffic info unavailable due to service error."

    def _construct_prompt(self, context, junction_name="Kochi Junction"):
        counts = context.get('yolo', {})
        rl = context.get('rl', {})
        sumo = context.get('sumo', {})
        alerts = context.get('alerts', {})
        violations = context.get('violations', [])
        emergency = context.get('emergency', {})
        
        text = f"Traffic Data for {junction_name}:\n"
        
        # Per-direction vehicle counts
        if counts:
            text += "Vehicle Counts by Direction:\n"
            for direction in ['North', 'South', 'East', 'West']:
                val = counts.get(direction, 0)
                if isinstance(val, dict):
                    val = val.get('count', 0)
                text += f"  - {direction}: {val} vehicles\n"
        
        # RL metrics
        if rl:
            avgs = rl.get('avg_counts', {})
            if avgs:
                text += f"10-min Average: N:{avgs.get('North',0):.1f}, S:{avgs.get('South',0):.1f}, E:{avgs.get('East',0):.1f}, W:{avgs.get('West',0):.1f}\n"
            text += f"AI Congestion Index: {rl.get('predicted_congestion_index', 0):.2f}\n"
            
            queue = rl.get('queue_length', 0)
            wait = rl.get('waiting_time', 0)
            if queue or wait:
                text += f"Queue Length: {queue} vehicles | Waiting Time: {wait:.1f}s\n"
        
        # SUMO metrics
        if sumo:
            text += f"Simulation Queue: {sumo.get('queue_length', 0)} vehicles\n"
            text += f"Simulation Waiting Time: {sumo.get('waiting_time', 0):.1f}s\n"
        
        # Emergency status
        if emergency and emergency.get('active'):
            text += f"\n⚠️ EMERGENCY ACTIVE: Priority override for {emergency.get('direction', 'unknown')} approach.\n"
        
        # Alert severity
        if alerts and alerts.get('severity') and alerts['severity'] != 'normal':
            text += f"\nActive Alert ({alerts['severity'].upper()}): {alerts.get('message', '')}\n"
        
        # Violations
        if violations:
            text += f"\nActive Violations: {len(violations)} (illegal parking / lane violations detected)\n"
        
        text += "\nBased on this data, provide a concise traffic status report for authorities. "
        text += "Include the junction name, most congested direction, estimated wait time, and any recommended actions."
        
        return text
