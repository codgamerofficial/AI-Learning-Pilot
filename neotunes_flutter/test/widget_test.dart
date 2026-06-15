import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import '../lib/core/widgets/glassmorphic_card.dart';
import '../lib/core/widgets/equalizer_bars.dart';

void main() {
  group('NeoTunes Widget Tests', () {
    testWidgets('GlassmorphicCard renders children correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: GlassmorphicCard(
              child: Text('Test Content'),
            ),
          ),
        ),
      );

      // Verify the child text is present
      expect(find.text('Test Content'), findsOneWidget);

      // Verify that BackdropFilter or ClipRRect are used in build tree
      expect(find.byType(BackdropFilter), findsOneWidget);
      expect(find.byType(ClipRRect), findsOneWidget);
    });

    testWidgets('EqualizerBars renders expected number of bars', (WidgetTester tester) async {
      const barCount = 5;
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EqualizerBars(
              color: Colors.purple,
              barCount: barCount,
              active: true,
            ),
          ),
        ),
      );

      // Verify widget renders
      expect(find.byType(EqualizerBars), findsOneWidget);

      // Check number of bars rendered
      // Each bar is a Container inside a Row
      final containers = find.descendant(
        of: find.byType(EqualizerBars),
        matching: find.byType(Container),
      );
      
      expect(containers, findsNWidgets(barCount));
    });
  });
}
