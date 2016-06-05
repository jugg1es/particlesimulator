/*
    Peter Roca
    
    I've never done anything like this before, so I got a little cute with it - bear with me.

    My general approach was to create a grid containing "wind vectors" that defined a direction and a strength.  They are 
    randomized, except for the first row or column (depending on which effect is being used) so the behavior wasn't too crazy.
    Then I created particles with random initial positions and velocities at the appropriate edge of panel depending on which effect is being used.
    
    If you press the Show Wind Vectors button, it will show you the grid with the vector direction.  The length of the vector line
    indicates the strength of the force.
    
    As the particles travel through the grid, the effect of the wind pushes the particles in the direction of the wind vector, creating 
    the effect of randomized movement.      
    
    Particles are not really generated on-demand.  You set the target number of particles, and the game loop decides whether it needs to add a 
    particle based on whether or not the number of active particles are less than the target number.  It will only create 1 particle per frame refresh.
    
    When a particle reaches the edge of the viewport, it is deleted, which means that the number of active particles is now less than the target
    number.  Deleting a particle essentially queue's up another particle to be created.
    
    I admit that this implementation means that the smaller the viewport is, the less likely it is that the number of active particles will ever reach 
    the target number.  This is because particles can leave the viewport faster than the game loop can replenish them.  It's kind of a nice
    way to do it, though, because it effectively prevents the viewport from being completely overrun with particles.  
    
    
    
    
    PUBLIC METHODS
    
    initialize() - creates the viewport and gets everything ready - required before doing anything else 
    play() - starts the active animation
    pause() - pauses the active animation
    setLeafAnimationActive() - sets the leaf animation as active
    setSnowAnimationActive() - sets the snow animation as active
    changeWind() - generates a new wind pattern
    changeWindVectorDisplay(show) - toggles wind vector display
    setNumberOfParticles(numParticles) - sets the target number of particles
    getNumberOfParticles() - gets the current particle number target
    setWindStrength(windFactor) - sets the wind vector strength factor
    getWindStrength() - gets the current wind vector strength factor
    resetParticles() - clears all particles from the viewport
    
    

*/


//Constructor - Initialize with the ID of the DIV where the animation should go.
//Also include the names for the SVGs for the leaf and the snowflake.  They should be included in-line in the HTML.
function ParticleEngine(selector, leafSVGname, snowSVGname) {
    this.panel = $('#' + selector);
        
    this.two = null;
    
    //      0 is leaf effect
    //      1 is snow effect
    this.activeAnimation = 0;
    
    //Initialize class-wide variables (don't change)
    this.particles = [];
    this.windVectors = [];
    this.animationPlaying = false;
    this.particleDisplayGroup = null;
    this.windVectorDisplayGroup = null;
    this.showWindVectors = false;    
    this.leafSVGname = leafSVGname;
    this.snowSVGname = snowSVGname;    
    
    
    
    //Target number of particles to create
    this.numParticles = 150;
    
    //Initial value for the wind effect - this is logarithmic and lower means stronger wind
    this.windEffectFactor = 50;   
    
    //Defines the size of the grid for each wind force vector (pixels)
    this.windVectorEdgeLength = 50;
   
}
//****
//  PUBLIC
//  Initializes the animation panel. This must be called before doing anything else.
//****
ParticleEngine.prototype.initialize = function() {
    if(this.panel == null || this.panel == undefined) {
        console.error("Invalid selector")
        return;
    }
    this.two = new Two({width: this.panel.width(), height: this.panel.height()}).appendTo(this.panel[0]);
    
    var me = this;
    this.two.bind('update', function(frameCount) {                 
          me.renderEffect(frameCount);
    });	
        
    
    this.generateWindVectors();
    this.particleDisplayGroup = this.two.makeGroup();
};

//****
//  PUBLIC
//  Plays the currently active effect
//****
ParticleEngine.prototype.play = function() {
    if(this.animationPlaying === true)
        return;
    this.animationPlaying = true;        
    this.two.play();
};

//****
//  PUBLIC
//  Pauses the currently active effect
//****
ParticleEngine.prototype.pause = function() {
    if(this.two === null) 
        return;
    if(this.animationPlaying === false)
        return;
    
    this.animationPlaying = false;
    this.two.pause();
};


//****
//  PUBLIC
//  Sets the active animation to the leaf effect
//****
ParticleEngine.prototype.setLeafAnimationActive = function() {
    if(this.activeAnimation === 0) 
        return;
    this.panel.css('background-color', '#fff');
    this.resetParticles();
    this.activeAnimation = 0;
    this.changeWind();
};

//****
//  PUBLIC
//  Sets the active animation to the snow effect
//****
ParticleEngine.prototype.setSnowAnimationActive = function() {
    if(this.activeAnimation === 1) 
        return;	
    
    this.panel.css('background-color', '#000');
    this.resetParticles();
    this.activeAnimation = 1;
    this.changeWind();
};

//****
//  PUBLIC
//  Generate new wind vectors
//****
ParticleEngine.prototype.changeWind = function() {
    this.generateWindVectors();
    this.drawWindVectors();
};

//****
//  PUBLIC
//  Toggles the visual representation of the wind vectors
//****
ParticleEngine.prototype.changeWindVectorDisplay = function(show) {
    this.showWindVectors = show;
    
    if(this.showWindVectors === false) {
        //If the vectors should be hidden, clear the group from the stage
        if( this.windVectorDisplayGroup != null) {
            this.two.remove( this.windVectorDisplayGroup);
            this.two.update();
            return;
        }
    } 
    this.drawWindVectors();
};


//****
//  PUBLIC
//  Sets the number of particles to display
//****
ParticleEngine.prototype.setNumberOfParticles = function(particleCount) {
    this.numParticles = particleCount;
};
//****
//  PUBLIC
//  Gets the number of particles to display
//****
ParticleEngine.prototype.getNumberOfParticles = function() {
    return this.numParticles;
};

//****
//  PUBLIC
//  Sets the strength of the wind. This value is logarithmic and lower is faster (cannot be zero)
//****
ParticleEngine.prototype.setWindStrength = function(windStrengthFactor) {
    if(windStrengthFactor <= 0) 
        return;
    this.windEffectFactor = windStrengthFactor;
};
//****
//  PUBLIC
//  Gets the strength of the wind. This value is logarithmic and lower is faster (cannot be zero)
//****
ParticleEngine.prototype.getWindStrength = function() {
    return this.windEffectFactor;
};

//****
//  PUBLIC
//  Resets particles in preparation for changing effects
//****
ParticleEngine.prototype.resetParticles = function() {
    if(this.two) {
        this.two.pause();        
        
        for(var i=	0;i<this.particles.length;i++) {      
            this.particleDisplayGroup.remove(this.particles[i]);
        }
        this.particles = [];
        this.two.play();
    }

};

//****
//  PRIVATE
//  This is the game loop that runs effectively at 60fps
//****
ParticleEngine.prototype.renderEffect = function(frameCount) {
    if(this.animationPlaying !== true) return;
    
    //If the target particle count hasn't been reached yet, generate a new particle every frame refresh
    if(this.particles.length < this.numParticles) {  
        this.createParticle();
    }         
    
    if(this.particles.length == 0) return;    
    
    //Iterate through all particles and animate them based on their location in the wind vector grid
    for(var i= this.particles.length-1;i>=0;i--) {
        var particle = this.particles[i];
        this.renderParticleEffect(particle);
    }
    
};
//****
//  PRIVATE
//  Performs the animation effect for the particle
//****
ParticleEngine.prototype.renderParticleEffect = function(particle) {    
    this.applyAcceleration (particle); 
    particle.translation.x += 1 * particle.velocityX;
    particle.translation.y += 1 * particle.velocityY;
    this.detectEdge(particle);        
    
};

//****
//  PRIVATE
//  Applies the wind vector to the particle's X and Y velocities
//****
ParticleEngine.prototype.applyAcceleration = function(particle) {
    var windVector = this.getWindVector(particle);
    if(windVector === undefined) return;
    
    var windDirection = {
        x: windVector.magnitude * 
                Math.cos(windVector.radians * Math.PI),
        y: windVector.magnitude * 
                Math.sin(windVector.radians * Math.PI),
    };
    
    particle.velocityX += windDirection.x / this.windEffectFactor;
    particle.velocityY += windDirection.y / this.windEffectFactor; 
};

//****
//  PRIVATE
//  Finds the wind vector for the particles current location
//****
ParticleEngine.prototype.getWindVector = function(particle) {
    //Instead of iterating through the 2D array to find the vector, the indices are being calculated.
    //I don't know if this is better than iterating through the array, but it seems to me that it would
    //be faster if the wind vector grid was a lot bigger
    var xIndex = Math.floor(particle.translation.x / this.windVectorEdgeLength) ;
    var yIndex = Math.floor(particle.translation.y / this.windVectorEdgeLength) ;       
    return this.windVectors[xIndex][yIndex]; 
};

//****
//  PRIVATE
//  Determines if the particle has left the viewport
//****
ParticleEngine.prototype.detectEdge = function(particle) {
    if(particle.translation.x < 0 ||
       particle.translation.x > this.two.width ||
       particle.translation.y < 0 ||
       particle.translation.y > this.two.width ) {        
        this.removeParticle(particle);
    }
};

//****
//  PRIVATE
//  Creates a new particle during the game loop
//****
ParticleEngine.prototype.createParticle = function() {    
    var newParticle = null;
    if(this.activeAnimation == 0){
        newParticle = this.createLeafParticle();
    } else {
         newParticle = this.createSnowParticle();    
    }    
    this.particleDisplayGroup.add(newParticle);   
    this.particles.push(newParticle);
    return newParticle;
};

//****
//  PRIVATE
//  Generates a leaf particle
//****
ParticleEngine.prototype.createLeafParticle = function() {  
    //Grab SVG from the in-line SVG in the html file defined when the class was instantiated
    var shape = this.two.interpret($('[name="' + this.leafSVGname + '"]')[0]).center();
    
    //Resize leaf from large original size
    shape.scale = 0.1;
    
    //Get random starting location at left of screen
    shape.translation.x = this.getXCoordinate();
    shape.translation.y = this.getYCoordinate();       
    
    //Generate initial velocity - increase min to speed it all up, 
    //increase difference between min and max for more variation
    var velocity = Helpers.getRandomNumber(3, 6);
    
    //Scale size according to how fast it is moving to give the illusion of 3D
    shape.scale =  shape.scale * (velocity /3) ;    
    
    shape.velocityX = velocity;
    shape.velocityY = 0;    
    
    return shape;    
};


//****
//  PRIVATE
//  Generates a now particle
//****
ParticleEngine.prototype.createSnowParticle = function() {    

    //Grab SVG from the in-line SVG in the html file defined when the class was instantiated
    var shape = this.two.interpret($('[name="' + this.snowSVGname + '"]')[0]).center();
    
    //Resize snowflake from large original size
    shape.scale = 0.5;
    
    //Get random starting location at top of screen
    shape.translation.x = this.getXCoordinate();
    shape.translation.y = this.getYCoordinate();    
    
    //Generate initial velocity - increase min to speed it all up, 
    //increase difference between min and max for more variation
    var velocity = Helpers.getRandomNumber(0.5,3);
    
    //Scale size according to how fast it is moving to give the illusion of 3D
    shape.scale = shape.scale * (velocity /2) ;
    
    shape.velocityX = 0;
    shape.velocityY = velocity;
    return shape; 
    
};


//****
//  PRIVATE
//  Gets an appropriate X coordinate
//****
ParticleEngine.prototype.getXCoordinate = function() {
    if(this.activeAnimation == 0) {
        return 0;
    } else if(this.activeAnimation == 1) {
        return Helpers.getRandomInteger(0, this.panel.width());
    }
};

//****
//  PRIVATE
//  Gets an appropriate Y coordinate
//****
ParticleEngine.prototype.getYCoordinate = function() {
    if(this.activeAnimation == 0) {
        return Helpers.getRandomInteger(0, this.panel.height());
    } else if(this.activeAnimation == 1) {
        return 0;
    }	
};
    
//****
//  PRIVATE
//  Generates the grid of wind vectors used to control randomized movement
//****
ParticleEngine.prototype.removeParticle = function(particle) {
    this.particleDisplayGroup.remove(particle);
    this.particles.splice(this.particles.indexOf(particle),1);
    
};




//****
//  PRIVATE
//  (Re)Generates the grid of wind vectors used to control randomized movement
//****
ParticleEngine.prototype.generateWindVectors = function() {
    this.windVectors = [];
    //Determine the number of wind vectors in the x and y direction
    var colNum = Math.ceil(this.panel.width() / this.windVectorEdgeLength);
    var rowNum = Math.ceil( this.panel.height() / this.windVectorEdgeLength);
    
    //Initialize the wind vector grid with random vectors
    for(var x=0;x<colNum;x++) {
        this.windVectors.push([]);
        for(var y=0;y<rowNum;y++) {
            this.windVectors[x].push({
                x: (x * this.windVectorEdgeLength) ,
                y: (y * this.windVectorEdgeLength),
                width: this.windVectorEdgeLength,
                height: this.windVectorEdgeLength,
                radians: Helpers.getRandomNumber(0,2),
                magnitude: Helpers.getRandomNumber(0,1)
            });
        }
    }       
    
    //Adjust the vectors according to the active animation to control super-crazy behavior
    if(this.activeAnimation == 0) {           
        for(var y=0;y<rowNum;y++) {
            this.windVectors[0][y].radians = 0;
            this.windVectors[0][y].magnitude = 1;
        }
        
    } else if(this.activeAnimation == 1) { 
        for(var x=0;x<colNum;x++) {
            this.windVectors[x][0].radians = 0.5;
            this.windVectors[x][0].magnitude = 1;
        }
    }
};


//****
//  PRIVATE
//  Draws the wind vector grid 
//****
ParticleEngine.prototype.drawWindVectors = function() {
    if(this.showWindVectors  !== true) return;
        
    if( this.windVectorDisplayGroup != null) {
        this.two.remove(this.windVectorDisplayGroup);
        this.two.update();
    }
    this.windVectorDisplayGroup  = this.two.makeGroup();
    var offset = this.windVectorEdgeLength / 2;
    for(var x=0;x<this.windVectors.length;x++) {            
        for(var y=0;y<this.windVectors[x].length;y++) {
            
            var rect = this.two.makeRectangle(
                this.windVectors[x][y].x + offset,
                this.windVectors[x][y].y + offset,
                this.windVectors[x][y].width, 
                this.windVectors[x][y].height );
            rect.noFill();
            rect.opacity = 0.5;
            rect.stroke = "#eee";
            rect.linewidth = 0.5;
            
            var startPoint = {
              x: this.windVectors[x][y].x + offset,
              y: this.windVectors[x][y].y + offset,
            };                
            var radius = ((this.windVectors[x][y].width /2) - 5) * this.windVectors[x][y].magnitude ;
            var endPoint = {
                x: startPoint.x + radius * 
                        Math.cos(this.windVectors[x][y].radians * Math.PI),
                y: startPoint.y + radius * 
                        Math.sin(this.windVectors[x][y].radians * Math.PI),
            };                
            var vector =  this.two.makeLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
            vector.stroke = "#000";
            if(this.activeAnimation == 1) {
              vector.stroke = "#eee";
            } 

           
            vector.opacity = 0.5;
            vector.linewidth = 1;
           var vectorEnd = this.two.makeCircle(endPoint.x, endPoint.y, 2);
           vectorEnd.fill ="#000";
           if(this.activeAnimation == 1) {
              vectorEnd.fill = "#eee";
            } 
           vectorEnd.noStroke();
            vectorEnd.opacity = 0.5;
           this.windVectorDisplayGroup.add(rect, vector, vectorEnd);
        }
    }       
    this.two.update();

};


var Helpers = new function () {

    this.getRandomInteger = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    this.getRandomNumber =  function(min, max)  {
        return Math.random() * (max - min) + min;
    }   
}

