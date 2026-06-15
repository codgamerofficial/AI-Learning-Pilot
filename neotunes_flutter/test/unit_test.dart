import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/core/theme/app_theme.dart';

void main() {
  group('NeoTunes AppTheme Unit Tests', () {
    test('Dark theme colors are initialized correctly', () {
      final theme = AppTheme.darkTheme;
      
      expect(theme.brightness, Brightness.dark);
      expect(theme.scaffoldBackgroundColor, const Color(0xFF0A0A0A));
      expect(theme.primaryColor, const Color(0xFF7C3AED));
    });

    test('Primary purple color matches expected HEX value', () {
      expect(AppTheme.primaryPurple.value, const Color(0xFF7C3AED).value);
    });

    test('Secondary blue color matches expected HEX value', () {
      expect(AppTheme.secondaryBlue.value, const Color(0xFF3B82F6).value);
    });

    test('Accent cyan color matches expected HEX value', () {
      expect(AppTheme.accentCyan.value, const Color(0xFF06B6D4).value);
    });
  });
}
