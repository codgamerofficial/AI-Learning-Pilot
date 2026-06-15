import 'dart:math';
import 'package:flutter/material.dart';

class EqualizerBars extends StatefulWidget {
  final Color color;
  final int barCount;
  final double height;
  final bool active;

  const EqualizerBars({
    Key? key,
    required this.color,
    this.barCount = 4,
    this.height = 14,
    this.active = true,
  }) : super(key: key);

  @override
  State<EqualizerBars> createState() => _EqualizerBarsState();
}

class _EqualizerBarsState extends State<EqualizerBars>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<double> _heightMultipliers = [];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    for (int i = 0; i < widget.barCount; i++) {
      _heightMultipliers.add(0.2 + _random.nextDouble() * 0.8);
    }

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..addListener(() {
        if (widget.active) {
          setState(() {
            for (int i = 0; i < widget.barCount; i++) {
              _heightMultipliers[i] = 0.2 + _random.nextDouble() * 0.8;
            }
          });
        }
      });

    if (widget.active) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(widget.barCount, (index) {
        return Container(
          width: 3,
          height: widget.height * _heightMultipliers[index],
          margin: const EdgeInsets.symmetric(horizontal: 1.5),
          decoration: BoxDecoration(
            color: widget.color,
            borderRadius: BorderRadius.circular(1.5),
          ),
        );
      }),
    );
  }
}
