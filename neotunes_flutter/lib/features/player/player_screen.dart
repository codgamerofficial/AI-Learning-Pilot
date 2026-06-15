import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/glassmorphic_card.dart';
import '../../core/widgets/equalizer_bars.dart';

class PlayerScreen extends StatefulWidget {
  final String trackTitle;
  final String trackArtist;
  final String trackColor;

  const PlayerScreen({
    Key? key,
    required this.trackTitle,
    required this.trackArtist,
    required this.trackColor,
  }) : super(key: key);

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  bool _isPlaying = true;
  double _sliderValue = 0.3;

  @override
  Widget build(BuildContext context) {
    final themeColor = Color(int.parse(widget.trackColor.replaceAll('#', '0xFF')));

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('NOW PLAYING', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Artwork with pulsing equalizer shadow
                    Container(
                      width: 240,
                      height: 240,
                      decoration: BoxDecoration(
                        color: AppTheme.surfaceGrey,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: themeColor.withOpacity(0.2),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.music_note, color: Colors.grey, size: 80),
                      ),
                    ),
                    const SizedBox(height: 32),
                    Text(
                      widget.trackTitle,
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.trackArtist,
                      style: const TextStyle(color: AppTheme.textMuted, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
            
            // Audio Controls Panel
            GlassmorphicCard(
              borderRadius: 28,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('0:45', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                        Text('3:12', style: TextStyle(color: AppTheme.textMuted, fontSize: 10)),
                      ],
                    ),
                    Slider(
                      value: _sliderValue,
                      activeColor: themeColor,
                      inactiveColor: Colors.white10,
                      onChanged: (val) {
                        setState(() {
                          _sliderValue = val;
                        });
                      },
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.shuffle),
                          onPressed: () {},
                        ),
                        IconButton(
                          icon: const Icon(Icons.skip_previous, size: 36),
                          onPressed: () {},
                        ),
                        FloatingActionButton(
                          backgroundColor: themeColor,
                          onPressed: () {
                            setState(() {
                              _isPlaying = !_isPlaying;
                            });
                          },
                          child: Icon(_isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.black),
                        ),
                        IconButton(
                          icon: const Icon(Icons.skip_next, size: 36),
                          onPressed: () {},
                        ),
                        IconButton(
                          icon: const Icon(Icons.repeat),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
