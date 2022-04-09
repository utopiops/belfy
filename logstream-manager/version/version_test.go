package version

import "testing"

func TestVersion(t *testing.T) {
	if got, want := Version.String(), "0.1.0"; got != want {
		t.Errorf("Want version %s, got %s", want, got)
	}
}
