"""Tests for SmartDateHandler service."""
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.smart_date_handler import SmartDateHandler


def test_on_time_scenario():
    """Test scenario 1: Date future ou retard ≤ 0 jour."""
    print("\n" + "="*60)
    print("TEST 1: COMMANDE DANS LE FUTUR (ON TIME)")
    print("="*60)
    
    # Date de livraison dans 5 jours
    current_date = datetime(2025, 11, 24)
    shipping_date = datetime(2025, 11, 29)
    
    result = SmartDateHandler.format_shipping_date_smart(
        shipping_date=shipping_date.strftime("%Y-%m-%d"),
        order_number="CMD12345678",
        current_date=current_date
    )
    
    print(f"Status: {result['status']}")
    print(f"Delay: {result['delay_days']} jours")
    print(f"Message:\n{result['message']}")
    assert result['status'] == "on_time"
    assert result['delay_days'] == 0
    print("\n✅ TEST PASSED")


def test_minor_delay_scenario():
    """Test scenario 2: Retard 1-3 jours."""
    print("\n" + "="*60)
    print("TEST 2: PETIT RETARD (1-3 JOURS)")
    print("="*60)
    
    # Date de livraison il y a 2 jours
    current_date = datetime(2025, 11, 24)
    shipping_date = datetime(2025, 11, 22)
    
    result = SmartDateHandler.format_shipping_date_smart(
        shipping_date=shipping_date.strftime("%Y-%m-%d"),
        order_number="CMD87654321",
        current_date=current_date
    )
    
    print(f"Status: {result['status']}")
    print(f"Delay: {result['delay_days']} jours")
    print(f"Message:\n{result['message']}")
    assert result['status'] == "minor_delay"
    assert 1 <= result['delay_days'] <= 3
    print("\n✅ TEST PASSED")


def test_major_delay_scenario():
    """Test scenario 3: Retard > 3 jours - Redirection hotline."""
    print("\n" + "="*60)
    print("TEST 3: RETARD IMPORTANT (> 3 JOURS)")
    print("="*60)
    
    # Date de livraison il y a 7 jours
    current_date = datetime(2025, 11, 24)
    shipping_date = datetime(2025, 11, 17)
    
    result = SmartDateHandler.format_shipping_date_smart(
        shipping_date=shipping_date.strftime("%Y-%m-%d"),
        order_number="CMD99999999",
        current_date=current_date
    )
    
    print(f"Status: {result['status']}")
    print(f"Delay: {result['delay_days']} jours")
    print(f"Message:\n{result['message']}")
    assert result['status'] == "major_delay"
    assert result['delay_days'] > 3
    assert "contact@coollibri.com" in result['message']
    assert "05 31 61 60 42" in result['message']
    print("\n✅ TEST PASSED")


def test_edge_case_exact_3_days():
    """Test edge case: Exactly 3 days delay (should be minor_delay)."""
    print("\n" + "="*60)
    print("TEST 4: EDGE CASE - EXACTEMENT 3 JOURS DE RETARD")
    print("="*60)
    
    current_date = datetime(2025, 11, 24)
    shipping_date = datetime(2025, 11, 21)
    
    result = SmartDateHandler.format_shipping_date_smart(
        shipping_date=shipping_date.strftime("%Y-%m-%d"),
        order_number="CMD33333333",
        current_date=current_date
    )
    
    print(f"Status: {result['status']}")
    print(f"Delay: {result['delay_days']} jours")
    print(f"Message:\n{result['message']}")
    assert result['status'] == "minor_delay"
    assert result['delay_days'] == 3
    print("\n✅ TEST PASSED")


def test_edge_case_exact_4_days():
    """Test edge case: Exactly 4 days delay (should be major_delay)."""
    print("\n" + "="*60)
    print("TEST 5: EDGE CASE - EXACTEMENT 4 JOURS DE RETARD")
    print("="*60)
    
    current_date = datetime(2025, 11, 24)
    shipping_date = datetime(2025, 11, 20)
    
    result = SmartDateHandler.format_shipping_date_smart(
        shipping_date=shipping_date.strftime("%Y-%m-%d"),
        order_number="CMD44444444",
        current_date=current_date
    )
    
    print(f"Status: {result['status']}")
    print(f"Delay: {result['delay_days']} jours")
    print(f"Message:\n{result['message']}")
    assert result['status'] == "major_delay"
    assert result['delay_days'] == 4
    print("\n✅ TEST PASSED")


def test_helper_functions():
    """Test helper functions."""
    print("\n" + "="*60)
    print("TEST 6: FONCTIONS UTILITAIRES")
    print("="*60)
    
    # Test get_delay_category
    assert SmartDateHandler.get_delay_category(0) == "on_time"
    assert SmartDateHandler.get_delay_category(-5) == "on_time"
    assert SmartDateHandler.get_delay_category(1) == "minor_delay"
    assert SmartDateHandler.get_delay_category(3) == "minor_delay"
    assert SmartDateHandler.get_delay_category(4) == "major_delay"
    assert SmartDateHandler.get_delay_category(10) == "major_delay"
    print("✅ get_delay_category() works correctly")
    
    # Test should_redirect_to_hotline
    assert SmartDateHandler.should_redirect_to_hotline(0) == False
    assert SmartDateHandler.should_redirect_to_hotline(3) == False
    assert SmartDateHandler.should_redirect_to_hotline(4) == True
    assert SmartDateHandler.should_redirect_to_hotline(10) == True
    print("✅ should_redirect_to_hotline() works correctly")
    
    print("\n✅ ALL HELPER TESTS PASSED")


if __name__ == "__main__":
    print("\n" + "🚀 " + "="*56 + " 🚀")
    print("     TESTS DE GESTION INTELLIGENTE DES DATES")
    print("🚀 " + "="*56 + " 🚀")
    
    try:
        test_on_time_scenario()
        test_minor_delay_scenario()
        test_major_delay_scenario()
        test_edge_case_exact_3_days()
        test_edge_case_exact_4_days()
        test_helper_functions()
        
        print("\n" + "🎉 " + "="*56 + " 🎉")
        print("     TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!")
        print("🎉 " + "="*56 + " 🎉\n")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        raise
