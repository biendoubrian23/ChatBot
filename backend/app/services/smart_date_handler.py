"""Smart date handling service for shipping date intelligence."""
from datetime import datetime, timedelta
from typing import Dict, Optional


class SmartDateHandler:
    """Handle intelligent date formatting and delay detection for shipping dates."""
    
    @staticmethod
    def format_shipping_date_smart(
        shipping_date: str,
        order_number: str,
        current_date: Optional[datetime] = None
    ) -> Dict[str, str]:
        """Format shipping date with intelligent delay detection.
        
        Args:
            shipping_date: Expected shipping date (format: "YYYY-MM-DD" or datetime)
            order_number: Order number for reference
            current_date: Current date (defaults to today)
            
        Returns:
            Dictionary with:
                - status: "on_time" | "minor_delay" | "major_delay"
                - message: Formatted message to display to user
                - delay_days: Number of days delayed (0 if on time)
        """
        if current_date is None:
            current_date = datetime.now()
        
        # Parse shipping date
        if isinstance(shipping_date, str):
            try:
                shipping_datetime = datetime.strptime(shipping_date, "%Y-%m-%d")
            except ValueError:
                try:
                    # Try alternative format
                    shipping_datetime = datetime.strptime(shipping_date, "%d/%m/%Y")
                except ValueError:
                    return {
                        "status": "error",
                        "message": "Date de livraison invalide. Contactez notre service client par email à contact@coollibri.com ou par téléphone au 05 31 61 60 42.",
                        "delay_days": 0
                    }
        else:
            shipping_datetime = shipping_date
        
        # Calculate delay in days
        delay = (current_date.date() - shipping_datetime.date()).days
        
        # Format the shipping date in French
        shipping_date_formatted = shipping_datetime.strftime("%d/%m/%Y")
        
        # SCENARIO 1: On time or future date (delay <= 0)
        if delay <= 0:
            return {
                "status": "on_time",
                "message": f"Votre colis devrait arriver le {shipping_date_formatted}.",
                "delay_days": 0,
                "formatted_date": shipping_date_formatted
            }
        
        # SCENARIO 2: Minor delay (1-3 days)
        elif 1 <= delay <= 3:
            return {
                "status": "minor_delay",
                "message": (
                    f"Votre commande #{order_number} devait arriver le {shipping_date_formatted}. "
                    f"Il semble y avoir un petit retard de {delay} jour{'s' if delay > 1 else ''}. "
                    f"Malheureusement, cela peut entraîner un délai supplémentaire de 1 à 2 semaines. "
                    f"Nous suivons votre commande de près."
                ),
                "delay_days": delay,
                "formatted_date": shipping_date_formatted
            }
        
        # SCENARIO 3: Major delay (> 3 days) - Redirect to customer service
        else:
            return {
                "status": "major_delay",
                "message": (
                    f"Votre commande #{order_number} devait arriver le {shipping_date_formatted}, "
                    f"soit il y a {delay} jours. "
                    f"Pour un retard de cette ampleur, je vous invite à contacter directement notre service client :\n\n"
                    f"📧 Email: contact@coollibri.com\n"
                    f"📞 Téléphone: 05 31 61 60 42\n\n"
                    f"⚠️ N'oubliez pas de mentionner votre numéro de commande #{order_number} dans votre message. "
                    f"L'équipe pourra vérifier l'état exact de votre commande et vous donner des précisions."
                ),
                "delay_days": delay,
                "formatted_date": shipping_date_formatted
            }
    
    @staticmethod
    def get_delay_category(delay_days: int) -> str:
        """Get delay category based on number of days.
        
        Args:
            delay_days: Number of days delayed
            
        Returns:
            "on_time" | "minor_delay" | "major_delay"
        """
        if delay_days <= 0:
            return "on_time"
        elif 1 <= delay_days <= 3:
            return "minor_delay"
        else:
            return "major_delay"
    
    @staticmethod
    def should_redirect_to_hotline(delay_days: int) -> bool:
        """Determine if user should be redirected to customer service.
        
        Args:
            delay_days: Number of days delayed
            
        Returns:
            True if delay > 3 days, False otherwise
        """
        return delay_days > 3
