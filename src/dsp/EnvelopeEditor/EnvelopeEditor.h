/*
 * EnvelopeEditor.h — SCHWUNG PORT STUB (JUCE-free).
 *
 * The real TAL Envelope Editor is a drawable multi-segment spline mod source
 * that depends on JUCE (Array<T>, juce::Point<float>, spline views). That whole
 * subsystem is deferred for the Schwung port; this no-op stub satisfies the
 * engine's construction + the `envelopeEditor->` calls (setTimeInformation,
 * setSpeedFactor) so SynthEngine/SynthVoice compile and run without it. The
 * per-voice modulation it would contribute is supplied as neutral (0 additive /
 * 1.0 multiplicative) by the handler stubs. Re-implement JUCE-free later to
 * restore the feature (a std::vector + a small Point struct is enough).
 */
#ifndef __EnvelopeEditor_h
#define __EnvelopeEditor_h

class EnvelopeEditor
{
public:
    EnvelopeEditor(float sampleRate) { (void)sampleRate; }
    void setTimeInformation(float bpm) { (void)bpm; }
    void setSpeedFactor(int speedFactor) { (void)speedFactor; }
    /* setPoints(Array<SplinePoint*>) intentionally omitted (JUCE type);
     * SynthEngine::setPoints is removed to match. */
};

#endif
