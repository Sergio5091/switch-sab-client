#!/bin/bash

# Wait 20 seconds for NetworkManager to reconnect to a known WiFi
# before checking the connection status
sleep 20

# List active WiFi connections, excluding our own fallback hotspot
CONNECTED=$(nmcli -t -f TYPE,STATE con show --active | grep -E "wifi|802-11-wireless" | grep -v "SwitchSAB-Setup")

if [ -z "$CONNECTED" ]; then
  echo "No Station connection detected - activating fallback hotspot"
  nmcli device wifi hotspot ifname wlan0 ssid "SwitchSAB-Setup" password "switchsab2026"
else
  echo "Station connection active - hotspot not needed"
fi
