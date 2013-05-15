SRC_FILES=$(shell find src/ -type f)

b2gremote.xpi: $(SRC_FILES)
	cd src; zip -r ../b2gremote.xpi *
